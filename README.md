# KAI LENS

仅用于展示个人摄影作品的独立网站。白色画廊、蓝色标识，首页精选影像、分类筛选、画廊与列表视图、作品详情和支持键盘/触屏操作的全屏看图。已有 HEIF 照片会按需生成 JPEG 展示副本，原图保留不变。

## 管理后台

`/admin` 保留单管理员登录，提供作品集增删改、批量上传、封面选择、照片排序、作品展示顺序、精选标记、回收站恢复、展厅品牌与首页设置、密码修改。博客和 AI 页面、相关接口均已移除；旧数据库中的历史内容不主动删除。

仅显示个人上传的作品，旧版 `/images/` 模板素材不参与展示。首页大图来自个人作品封面，不再使用独立模板图片。首次启动只初始化数据库和管理员密码，不再生成任何示例内容。

## 本地启动

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
ADMIN_PASSWORD=kailens-local uvicorn main:app --reload
```

另开终端：

```bash
cd frontend
npm ci
npm run dev
```

打开 `http://localhost:5173`。后端接口文档：`http://localhost:8000/api/docs`。

## 验证

```bash
npm --prefix frontend run build
cd backend
python -m unittest discover -s tests -v
```

## 数据与部署

SQLite 默认位于 `backend/data/kailens.db`，上传图片位于 `backend/uploads`。可用 `DATABASE_PATH` 和 `UPLOAD_DIR` 指定独立存储路径。生产环境需设置 `ENVIRONMENT=production`、`APP_SECRET`、`ADMIN_PASSWORD`。管理员密码只在首次初始化时写入，之后通过后台修改。

支持 Docker Compose + Caddy，或现有 Nginx + systemd 原生部署。原生服务默认目录 `/opt/kailens`。发布前备份数据库、上传图片和代码；本次重构涉及后端接口，需要前后端一同更新。已上传的作品和照片可直接沿用。

作品集支持每页 12 个的分页；前台使用服务端分页、分类筛选，页码和分类写入地址栏，支持刷新和返回。后台作品列表、搜索结果及回收站也支持分页。

版本发布、记录和回滚命令详见 [发布与回滚](deploy/发布与回滚.md)。程序回滚默认保留当前作品数据和照片。
