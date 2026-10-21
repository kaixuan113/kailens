# KAI LENS

个人摄影作品集、博客、轻量 Agent 实验室与管理员后台。

## 功能

- `/`：摄影作品集与个人介绍
- `/blog`：博客列表和 Markdown 文章详情
- `/ai`：可选择 Skill 的轻量 Agent 问答
- `/admin`：作品、文章和 Skill 的增删改管理
- SQLite 持久化，适合 2 核 2GB 的个人服务器
- Docker Compose + Caddy 部署，绑定域名后可自动启用 HTTPS

## 本地运行

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
ADMIN_PASSWORD=kailens-local uvicorn main:app --reload
```

另开一个终端：

```bash
cd frontend
npm install
npm run dev
```

打开 `http://localhost:5173`。

## Docker 部署

```bash
cp .env.example .env
# 修改 APP_SECRET 与 ADMIN_PASSWORD
docker compose up -d --build
```

首次启动会生成 `backend/data/kailens.db` 并写入示例内容。上传图片保存在 `backend/uploads`。生产环境建议定期备份这两个目录。

## 配置模型

支持 OpenAI 兼容接口：

```env
MODEL_BASE_URL=https://api.openai.com/v1
MODEL_API_KEY=your-key
MODEL_NAME=gpt-4o-mini
```

未配置 Key 时，`/ai` 使用演示模式，仍可验证 Skill 加载与 Agent 请求流程。

## 绑定域名

将 `Caddyfile` 第一行从 `:80` 改为域名，例如 `kailens.com`，并让域名 A 记录指向服务器公网 IP，然后运行：

```bash
docker compose restart caddy
```

Caddy 会自动申请并续期 HTTPS 证书。

## 中国大陆服务器原生部署

如果服务器无法连接 Docker Hub，可直接使用更省内存的 Nginx + systemd 方案：

```bash
bash deploy/install-native.sh
```

运行前需确保前端已构建到 `frontend/dist`，且根目录存在生产环境 `.env`。API 服务状态可通过 `systemctl status kailens-api` 查看。
