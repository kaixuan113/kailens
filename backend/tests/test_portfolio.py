"""Exercise the photography workflow against isolated storage."""
import os
from io import BytesIO
from PIL import Image
import tempfile
import unittest
from pathlib import Path

TEMP = tempfile.TemporaryDirectory()
os.environ['DATABASE_PATH'] = str(Path(TEMP.name) / 'test.db')
os.environ['UPLOAD_DIR'] = str(Path(TEMP.name) / 'uploads')
os.environ['ADMIN_PASSWORD'] = 'local-test-password'
os.environ['APP_SECRET'] = 'isolated-test-secret'

from fastapi.testclient import TestClient
import db
from main import app


class PortfolioFlow(unittest.TestCase):
    def test_photographer_workflow(self):
        with TestClient(app) as client:
            self.assertEqual(client.get('/api/v1/works').json(), [])
            self.assertEqual(client.get('/api/v1/admin/works').status_code, 401)
            self.assertEqual(client.post('/api/v1/admin/login', json={'password': 'wrong-password'}).status_code, 401)
            token = client.post('/api/v1/admin/login', json={'password': 'local-test-password'}).json()['token']
            headers = {'Authorization': 'Bearer ' + token}
            self.assertEqual(client.post('/api/v1/admin/upload', headers=headers, files={'file': ('no.txt', b'no', 'text/plain')}).status_code, 400)
            binary = BytesIO()
            Image.new('RGB', (2, 2), '#ffffff').save(binary, format='JPEG')
            image_bytes = binary.getvalue()
            self.assertEqual(client.post('/api/v1/admin/upload', headers=headers, files={'file': ('bad.jpg', b'invalid-image', 'image/jpeg')}).status_code, 400)
            image = client.post('/api/v1/admin/upload', headers=headers, files={'file': ('image.jpg', image_bytes, 'image/jpeg')}).json()['url']
            self.assertEqual(client.get(image).content, image_bytes)
            heif = BytesIO()
            Image.new('RGB', (64, 64), '#aaccee').save(heif, format='HEIF')
            heif_bytes = heif.getvalue()
            heif_url = client.post('/api/v1/admin/upload', headers=headers, files={'file': ('phone.jpg', heif_bytes, 'image/jpeg')}).json()['url']
            rendition = client.get(heif_url)
            self.assertTrue(rendition.content.startswith(b'\xff\xd8'))
            self.assertEqual(rendition.headers['content-type'], 'image/jpeg')
            self.assertEqual(Path(os.environ['UPLOAD_DIR'], heif_url.split('/')[-1]).read_bytes(), heif_bytes)
            payload = {'title': '测试作品', 'image_url': image, 'gallery_urls': [image, '/uploads/second.jpg', image], 'category': '旅行', 'sort_order': 2}
            created = client.post('/api/v1/admin/works', headers=headers, json=payload)
            self.assertEqual(created.status_code, 200)
            work = created.json()
            self.assertEqual(work['gallery_urls'], [image, '/uploads/second.jpg'])
            settings = client.get('/api/v1/portfolio-settings').json()
            settings['featured_work_id'] = work['id']
            self.assertEqual(client.put('/api/v1/admin/portfolio-settings', headers=headers, json=settings).status_code, 200)
            settings['featured_work_id'] = 99999
            self.assertEqual(client.put('/api/v1/admin/portfolio-settings', headers=headers, json=settings).status_code, 400)
            payload['gallery_urls'] = ['/uploads/second.jpg', image]
            payload['title'] = '已修改'
            updated = client.put(f"/api/v1/admin/works/{work['id']}", headers=headers, json=payload).json()
            self.assertEqual(updated['gallery_urls'], ['/uploads/second.jpg', image])
            self.assertEqual(updated['title'], '已修改')
            self.assertEqual(client.put('/api/v1/admin/works/99999', headers=headers, json=payload).status_code, 404)
            client.delete(f"/api/v1/admin/works/{work['id']}", headers=headers)
            self.assertEqual(client.get('/api/v1/works').json(), [])
            self.assertEqual(client.get(f"/api/v1/works/{work['id']}").status_code, 404)
            self.assertEqual(len(client.get('/api/v1/admin/trash/works', headers=headers).json()), 1)
            self.assertTrue(Path(os.environ['UPLOAD_DIR'], image.split('/')[-1]).exists())
            client.post(f"/api/v1/admin/trash/works/{work['id']}/restore", headers=headers)
            self.assertEqual(len(client.get('/api/v1/works').json()), 1)
            db.execute("INSERT INTO works(title,category,location,year,image_url) VALUES ('模板','风景','','','/images/work-1.jpg')")
            self.assertEqual(len(client.get('/api/v1/works').json()), 1)
            for path in ['/api/v1/posts', '/api/v1/skills', '/api/v1/admin/posts', '/api/v1/home-settings']:
                self.assertEqual(client.get(path, headers=headers).status_code, 404)
            self.assertEqual(client.post('/api/v1/agent/chat', json={'message': '你好'}).status_code, 404)
            self.assertEqual(client.post('/api/v1/admin/password', headers=headers, json={'current_password': 'wrong', 'new_password': 'new-test-password'}).status_code, 400)
            self.assertEqual(client.post('/api/v1/admin/password', headers=headers, json={'current_password': 'local-test-password', 'new_password': 'new-test-password'}).status_code, 200)
            self.assertEqual(client.post('/api/v1/admin/login', json={'password': 'new-test-password'}).status_code, 200)

    def test_zpagination_filters_and_boundaries(self):
        with TestClient(app) as client:
            for index in range(25):
                db.execute("INSERT INTO works(title,category,location,year,image_url,sort_order) VALUES (?,?,?,?,?,?)", (f'分页作品{index}', '分页验证' if index < 13 else '其他验证', '北京', '2026', f'/uploads/page-{index}.jpg', index))
            first = client.get('/api/v1/works/page', params={'category': '分页验证'}).json()
            second = client.get('/api/v1/works/page', params={'category': '分页验证', 'page': 2}).json()
            self.assertEqual(first['total'], 13)
            self.assertEqual(len(first['items']), 12)
            self.assertEqual(len(second['items']), 1)
            self.assertEqual(second['total_pages'], 2)
            self.assertTrue(set(w['id'] for w in first['items']).isdisjoint(w['id'] for w in second['items']))
            self.assertEqual(client.get('/api/v1/works/page', params={'category': '分页验证', 'page': 999}).json()['page'], 2)
            empty = client.get('/api/v1/works/page', params={'category': '不存在'}).json()
            self.assertEqual(empty['total'], 0)
            self.assertEqual(empty['items'], [])
            self.assertEqual(empty['page'], 1)
            self.assertTrue(any(c['category'] == '分页验证' and c['count'] == 13 for c in second['categories']))
            self.assertEqual(first['featured']['id'], second['featured']['id'])
            for query in ('page=0', 'page=-1', 'page_size=99', 'page_size=0'):
                self.assertEqual(client.get('/api/v1/works/page?' + query).status_code, 422)


if __name__ == '__main__':
    unittest.main()
