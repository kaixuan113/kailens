# KAI LENS 摄影 API

FastAPI + SQLite，提供个人作品展示、展厅设置、管理员认证、作品集管理、回收站恢复和图片上传。

公开接口：`/api/v1/works`、`/api/v1/works/{id}`、`/api/v1/portfolio-settings`、`/api/v1/health`。
管理员接口位于 `/api/v1/admin/`，除登录外均需要 Bearer Token。

本地启动与部署见根目录 README。数据库初始化不会创建示例作品，也不会覆盖已上传作品、图片或管理员密码。旧版博客与 AI 接口已移除，历史表不主动删除。
