#!/usr/bin/env python3
"""Versioned native deployments; data and uploads stay outside release folders."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import subprocess
import sys
import tarfile
import time
import urllib.request

ROOT = Path('/opt/kailens')


def stamp():
    return datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')


def run(*args):
    subprocess.run(args, check=True)


def validate_version(version):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,100}', version):
        raise ValueError('版本号只能包含字母、数字、点、下划线和短横线')
    return version


def releases():
    path = ROOT / 'releases'
    path.mkdir(parents=True, exist_ok=True)
    return path


def current_version():
    current = ROOT / 'current'
    return current.resolve().name if current.is_symlink() else None


def history():
    log = ROOT / 'deploy' / 'releases.jsonl'
    return [json.loads(line) for line in log.read_text().splitlines() if line] if log.exists() else []


def record(**values):
    log = ROOT / 'deploy' / 'releases.jsonl'
    log.parent.mkdir(parents=True, exist_ok=True)
    values['time'] = datetime.now(timezone.utc).isoformat()
    with log.open('a') as file:
        file.write(json.dumps(values, ensure_ascii=False) + '\n')
        file.flush()
        os.fsync(file.fileno())


def swap(version):
    destination = releases() / validate_version(version)
    if not destination.is_dir():
        raise ValueError('找不到版本：' + version)
    temporary = ROOT / '.current-next'
    temporary.unlink(missing_ok=True)
    temporary.symlink_to(destination, target_is_directory=True)
    os.replace(temporary, ROOT / 'current')


def backup_data(label):
    directory = ROOT / 'backups' / 'releases' / (stamp() + '-' + label)
    directory.mkdir(parents=True, mode=0o700)
    os.chmod(directory, 0o700)
    source = ROOT / 'backend' / 'data' / 'kailens.db'
    if source.exists():
        with sqlite3.connect(str(source)) as original, sqlite3.connect(str(directory / 'kailens.db')) as copy:
            original.backup(copy)
        os.chmod(directory / 'kailens.db', 0o600)
    return directory


def attach_storage(directory):
    backend = directory / 'backend'
    for name in ('data', 'uploads'):
        target = backend / name
        if target.exists() or target.is_symlink():
            raise ValueError('发布包不应包含数据库或上传目录：' + str(target))
        target.symlink_to(ROOT / 'backend' / name, target_is_directory=True)


def initialize():
    if (ROOT / 'current').is_symlink():
        return
    baseline = 'baseline-' + stamp()
    destination = releases() / baseline
    destination.mkdir()
    shutil.copytree(ROOT / 'backend', destination / 'backend', ignore=shutil.ignore_patterns('.venv', 'venv', 'data', 'uploads', '__pycache__'))
    shutil.copytree(ROOT / 'frontend', destination / 'frontend', ignore=shutil.ignore_patterns('node_modules', '*.tsbuildinfo'))
    attach_storage(destination)
    (destination / '.venv').symlink_to(ROOT / 'backend' / '.venv', target_is_directory=True)
    (destination / 'manifest.json').write_text(json.dumps({'version': baseline, 'description': '重构发布前的线上版本，保留旧版完整页面和接口'}, ensure_ascii=False, indent=2))
    backup = backup_data('baseline')
    # An additional original-image snapshot is kept before the first managed release.
    with tarfile.open(backup / 'uploads.tar.gz', 'w:gz') as archive:
        archive.add(ROOT / 'backend' / 'uploads', arcname='uploads')
    swap(baseline)
    frontend_dist = ROOT / 'frontend' / 'dist'
    if frontend_dist.is_dir() and not frontend_dist.is_symlink():
        shutil.move(str(frontend_dist), str(backup / 'frontend-dist'))
    frontend_dist.symlink_to(ROOT / 'current' / 'frontend' / 'dist', target_is_directory=True)
    override = Path('/etc/systemd/system/kailens-api.service.d/release.conf')
    override.parent.mkdir(parents=True, exist_ok=True)
    if override.exists():
        shutil.copy2(override, backup / 'previous-release.conf')
    override.write_text('[Service]\nWorkingDirectory=/opt/kailens/current/backend\nExecStart=\nExecStart=/opt/kailens/current/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1\nEnvironment=DATABASE_PATH=/opt/kailens/backend/data/kailens.db\nEnvironment=UPLOAD_DIR=/opt/kailens/backend/uploads\n')
    run('systemctl', 'daemon-reload')
    record(version=baseline, previous=None, operation='baseline', status='success', description='纳管原有线上版本', backup=str(backup))
    print('已保存原有版本：' + baseline, flush=True)


def restart_and_check():
    run('systemctl', 'restart', 'kailens-api')
    for attempt in range(30):
        try:
            with urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=2) as response:
                if json.load(response).get('status') == 'ok':
                    break
        except Exception:
            time.sleep(1)
    else:
        raise RuntimeError('后端健康检查失败')
    for path in ('/', '/admin'):
        run('curl', '--fail', '--silent', '--show-error', '--max-time', '15', '--resolve', 'kailens.com:443:127.0.0.1', '-o', '/dev/null', 'https://kailens.com' + path)


def activate(version, operation, description):
    destination = releases() / validate_version(version)
    for item in ('backend/main.py', 'frontend/dist/index.html', '.venv/bin/python'):
        if not (destination / item).exists():
            raise ValueError('版本不完整，缺少：' + item)
    previous = current_version()
    if version == previous:
        raise ValueError('该版本已经在线上运行')
    backup = backup_data(operation)
    try:
        swap(version)
        restart_and_check()
    except Exception as error:
        if previous:
            swap(previous)
            try:
                restart_and_check()
            except Exception as recovery:
                record(version=version, previous=previous, operation=operation, status='recovery_failed', description=description, error=str(error), recovery_error=str(recovery), backup=str(backup))
                raise RuntimeError('发布失败，自动恢复也未通过健康检查，请检查服务日志') from recovery
        record(version=version, previous=previous, operation=operation, status='failed_restored', description=description, error=str(error), backup=str(backup))
        raise RuntimeError('发布失败，已恢复到原版本：' + str(previous)) from error
    record(version=version, previous=previous, operation=operation, status='success', description=description, backup=str(backup))
    print('当前版本：' + version)
    print('上一个版本：' + str(previous))
    print('发布前数据库备份：' + str(backup))
    print('作品数据库和上传照片保持现状，未恢复历史数据。')


def install(archive_path, version, description):
    version = validate_version(version)
    destination = releases() / version
    if destination.exists():
        raise ValueError('版本号已经存在，请使用新的版本号')
    destination.mkdir()
    with tarfile.open(archive_path) as archive:
        archive.extractall(destination, filter='data')
    attach_storage(destination)
    digest = hashlib.sha256(Path(archive_path).read_bytes()).hexdigest()
    (destination / 'manifest.json').write_text(json.dumps({'version': version, 'description': description, 'archive_sha256': digest, 'created_at': datetime.now(timezone.utc).isoformat()}, ensure_ascii=False, indent=2))
    run('python3', '-m', 'venv', str(destination / '.venv'))
    run(str(destination / '.venv/bin/pip'), 'install', '--disable-pip-version-check', '--no-cache-dir', '--timeout', '30', '-i', 'https://mirrors.aliyun.com/pypi/simple/', '-r', str(destination / 'backend/requirements.txt'))
    # Syntax and import checks run before any live paths are changed.
    run(str(destination / '.venv/bin/python'), '-m', 'compileall', '-q', str(destination / 'backend'))
    subprocess.run([str(destination / '.venv/bin/python'), '-c', 'import main; print("新版本后端导入检查通过")'], cwd=destination / 'backend', check=True)
    initialize()
    activate(version, 'publish', description)


def main():
    parser = argparse.ArgumentParser(description='KAI LENS 版本发布与回滚；默认永远不回滚作品数据')
    commands = parser.add_subparsers(dest='command', required=True)
    publish = commands.add_parser('install', help='安装并发布新版本')
    publish.add_argument('--archive', required=True)
    publish.add_argument('--version', required=True)
    publish.add_argument('--description', required=True)
    rollback = commands.add_parser('rollback', help='回滚程序版本，保留当前作品和图片')
    rollback.add_argument('version', nargs='?')
    commands.add_parser('list', help='查看发布及回滚记录')
    commands.add_parser('status', help='查看当前版本')
    args = parser.parse_args()
    if args.command == 'list':
        for item in history():
            print(item['time'], item['operation'], item['version'], item['status'], item.get('description', ''))
    elif args.command == 'status':
        print('当前线上版本：' + str(current_version()))
    elif args.command == 'install':
        install(args.archive, args.version, args.description)
    else:
        version = args.version
        if not version:
            for item in reversed(history()):
                if item['status'] == 'success' and item['version'] == current_version() and item.get('previous'):
                    version = item['previous']
                    break
        if not version:
            raise ValueError('未找到可回滚版本，请先查看 list')
        activate(version, 'rollback', '回滚程序版本，保留当前作品数据')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('操作失败：' + str(error), file=sys.stderr)
        sys.exit(1)
