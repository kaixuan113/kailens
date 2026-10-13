# Kai Lens API

FastAPI + SQLite 后端，提供公开内容接口、管理员认证、作品/文章/Skill CRUD、图片上传和 OpenAI 兼容的 Agent 调用。

## 启动

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
ADMIN_PASSWORD=kailens-local uvicorn main:app --reload
```

接口文档位于 `http://localhost:8000/api/docs`。

生产环境必须设置 `APP_SECRET`、`ADMIN_PASSWORD` 和 `ENVIRONMENT=production`。管理员密码仅在数据库首次初始化时写入，之后不会因环境变量变化而自动覆盖。
