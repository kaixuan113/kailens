#!/usr/bin/env python3
"""Reject non-public dependency download URLs without printing their values."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
LOCK = 'frontend/package-lock.json'


def check(data):
    document = json.loads(data)
    violations = 0
    for package in document.get('packages', {}).values():
        address = package.get('resolved')
        if not address:
            continue
        parsed = urlsplit(address)
        if parsed.scheme != 'https' or parsed.hostname != 'registry.npmjs.org' or parsed.username or parsed.password:
            violations += 1
    return violations


def main():
    parser = argparse.ArgumentParser(description='检查当前及历史依赖锁文件，仅允许公共 npm 下载地址，不输出敏感原文')
    parser.add_argument('--history', action='store_true', help='同时检查本地所有分支和标签的可达历史')
    args = parser.parse_args()
    bad = []
    current = ROOT / LOCK
    if current.exists() and check(current.read_bytes()):
        bad.append('当前依赖锁文件')
    checked = 0
    if args.history:
        entries = subprocess.check_output(['git', 'rev-list', '--objects', '--all'], cwd=ROOT).decode().splitlines()
        seen = set()
        for entry in entries:
            sha, _, path = entry.partition(' ')
            if path != LOCK or sha in seen:
                continue
            seen.add(sha)
            content = subprocess.check_output(['git', 'cat-file', 'blob', sha], cwd=ROOT)
            checked += 1
            if check(content):
                bad.append('历史依赖锁文件对象 ' + sha[:8])
    if bad:
        print('检查未通过：检测到非公共依赖源，已阻止继续提交或推送。', file=sys.stderr)
        for label in bad:
            print(label, file=sys.stderr)
        return 1
    print(f'公共依赖源检查通过；已检查 {checked} 个历史锁文件对象。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
