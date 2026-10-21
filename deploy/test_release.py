import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('release', Path(__file__).with_name('release.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseRollbackTest(unittest.TestCase):
    def test_switch_rollback_and_failed_release_keep_live_data(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(release, 'ROOT', Path(folder)):
            root = Path(folder)
            (root / 'backend/data').mkdir(parents=True)
            with sqlite3.connect(root / 'backend/data/kailens.db') as db:
                db.execute('CREATE TABLE works (title TEXT)')
                db.execute("INSERT INTO works VALUES ('新增作品保留')")
            for version in ('old', 'new', 'broken'):
                target = root / 'releases' / version
                (target / 'backend').mkdir(parents=True)
                (target / 'frontend/dist').mkdir(parents=True)
                (target / '.venv/bin').mkdir(parents=True)
                for file in ('backend/main.py', 'frontend/dist/index.html', '.venv/bin/python'):
                    (target / file).write_text(version)
            release.swap('old')
            with patch.object(release, 'restart_and_check'):
                release.activate('new', 'publish', '测试发布')
                release.activate('old', 'rollback', '测试回滚')
            self.assertEqual(release.current_version(), 'old')
            with patch.object(release, 'restart_and_check', side_effect=[RuntimeError('模拟故障'), None]):
                with self.assertRaisesRegex(RuntimeError, '已恢复到原版本'):
                    release.activate('broken', 'publish', '测试失败自动恢复')
            self.assertEqual(release.current_version(), 'old')
            with sqlite3.connect(root / 'backend/data/kailens.db') as db:
                self.assertEqual(db.execute('SELECT title FROM works').fetchone()[0], '新增作品保留')
            records = release.history()
            self.assertEqual([r['status'] for r in records], ['success', 'success', 'failed_restored'])
            self.assertTrue(all(Path(r['backup'], 'kailens.db').exists() for r in records))


if __name__ == '__main__':
    unittest.main()
