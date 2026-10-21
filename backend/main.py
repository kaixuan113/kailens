import json
import logging
import os
import uuid
from pathlib import Path
from typing import Dict

import httpx
import uvicorn
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import db
from auth import create_token, hash_password, require_admin, verify_password
from schemas import ChatRequest, HomeSettingsPayload, LoginRequest, PasswordRequest, PostPayload, SkillPayload, WorkPayload

LOGGER = logging.getLogger(__name__)
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_HOME_SETTINGS = {
    "portfolio_label": "Portfolio · 2026",
    "eyebrow": "光落下的地方",
    "title_primary": "Still",
    "title_accent": "moving.",
    "description": "我拍摄城市之间的停顿、陌生人的一瞥，以及那些差一点被忽略的日常。",
    "hero_image_url": "/images/hero.jpg",
    "hero_alt": "公路穿过红色山谷",
    "caption_left": "37.7749° N",
    "caption_right": "Personal archive",
}

app = FastAPI(title="Kai Lens API", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[item.strip() for item in os.environ.get("CORS_ORIGINS", "*").split(",")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.on_event("startup")
def startup() -> None:
    db.init_database()


@app.get("/api/v1/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


def read_home_settings() -> Dict[str, str]:
    setting = db.row("SELECT value FROM settings WHERE key = 'home_page'")
    if not setting:
        return dict(DEFAULT_HOME_SETTINGS)
    try:
        saved = json.loads(setting["value"])
    except (TypeError, json.JSONDecodeError):
        LOGGER.warning("Invalid home_page settings; using defaults")
        return dict(DEFAULT_HOME_SETTINGS)
    return {
        key: str(saved.get(key, default_value))
        for key, default_value in DEFAULT_HOME_SETTINGS.items()
    }


@app.get("/api/v1/home-settings")
def public_home_settings():
    return read_home_settings()


@app.get("/api/v1/works")
def public_works():
    return [db.normalize_work(item) for item in db.rows("SELECT * FROM works ORDER BY sort_order, id DESC")]


@app.get("/api/v1/works/{item_id}")
def public_work(item_id: int):
    item = db.row("SELECT * FROM works WHERE id = ?", (item_id,))
    if not item:
        raise HTTPException(status_code=404, detail="作品集不存在")
    return db.normalize_work(item)


@app.get("/api/v1/posts")
def public_posts():
    items = db.rows("SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC, id DESC")
    return [db.normalize_post(item) for item in items]


@app.get("/api/v1/posts/{slug}")
def public_post(slug: str):
    item = db.row("SELECT * FROM posts WHERE slug = ? AND status = 'published'", (slug,))
    if not item:
        raise HTTPException(status_code=404, detail="文章不存在")
    return db.normalize_post(item)


@app.get("/api/v1/skills")
def public_skills():
    return db.rows("SELECT id, name, description, enabled FROM skills WHERE enabled = 1 ORDER BY id")


@app.post("/api/v1/agent/chat")
async def agent_chat(payload: ChatRequest):
    skill = db.row("SELECT * FROM skills WHERE id = ? AND enabled = 1", (payload.skill_id,)) if payload.skill_id else None
    instructions = skill["instructions"] if skill else "你是 Kai Lens 网站中的轻量助手，请用简洁、友好的中文回答。"
    api_key = os.environ.get("MODEL_API_KEY", "")
    base_url = os.environ.get("MODEL_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.environ.get("MODEL_NAME", "gpt-4o-mini")
    if not api_key:
        skill_name = skill["name"] if skill else "通用助手"
        return {
            "mode": "demo",
            "answer": "已跑通 Agent 基本流程：加载「{}」Skill → 组合系统指令 → 接收你的问题「{}」。\n\n当前还没有配置模型 API Key，所以这是演示响应。配置后这里会返回真实模型结果。".format(skill_name, payload.message[:120]),
        }
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                "{}/chat/completions".format(base_url),
                headers={"Authorization": "Bearer {}".format(api_key), "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": instructions},
                        {"role": "user", "content": payload.message},
                    ],
                    "temperature": 0.7,
                },
            )
            response.raise_for_status()
            body = response.json()
            return {"mode": "model", "answer": body["choices"][0]["message"]["content"]}
    except Exception as error:
        LOGGER.exception("Model request failed")
        raise HTTPException(status_code=502, detail="模型服务暂时不可用：{}".format(str(error)[:160]))


@app.post("/api/v1/admin/login")
def admin_login(payload: LoginRequest):
    setting = db.row("SELECT value FROM settings WHERE key = 'admin_password'")
    if not setting or not verify_password(payload.password, setting["value"]):
        raise HTTPException(status_code=401, detail="密码错误")
    return {"token": create_token()}


@app.post("/api/v1/admin/password", dependencies=[Depends(require_admin)])
def change_password(payload: PasswordRequest):
    setting = db.row("SELECT value FROM settings WHERE key = 'admin_password'")
    if not setting or not verify_password(payload.current_password, setting["value"]):
        raise HTTPException(status_code=400, detail="当前密码错误")
    db.execute("UPDATE settings SET value = ? WHERE key = 'admin_password'", (hash_password(payload.new_password),))
    return {"ok": True}


@app.get("/api/v1/admin/home-settings", dependencies=[Depends(require_admin)])
def admin_home_settings():
    return read_home_settings()


@app.put("/api/v1/admin/home-settings", dependencies=[Depends(require_admin)])
def update_home_settings(payload: HomeSettingsPayload):
    values = payload.dict()
    db.execute(
        "INSERT INTO settings (key, value) VALUES ('home_page', ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (json.dumps(values, ensure_ascii=False),),
    )
    return values


@app.get("/api/v1/admin/works", dependencies=[Depends(require_admin)])
def admin_works():
    return [db.normalize_work(item) for item in db.rows("SELECT * FROM works ORDER BY sort_order, id DESC")]


@app.post("/api/v1/admin/works", dependencies=[Depends(require_admin)])
def create_work(payload: WorkPayload):
    values = payload.dict()
    new_id = db.execute(
        "INSERT INTO works (title, category, location, year, image_url, description, featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (values["title"], values["category"], values["location"], values["year"], values["image_url"], values["description"], int(values["featured"]), values["sort_order"]),
    )
    db.replace_work_images(new_id, values["gallery_urls"])
    return db.normalize_work(db.row("SELECT * FROM works WHERE id = ?", (new_id,)))


@app.put("/api/v1/admin/works/{item_id}", dependencies=[Depends(require_admin)])
def update_work(item_id: int, payload: WorkPayload):
    values = payload.dict()
    db.execute(
        "UPDATE works SET title=?, category=?, location=?, year=?, image_url=?, description=?, featured=?, sort_order=? WHERE id=?",
        (values["title"], values["category"], values["location"], values["year"], values["image_url"], values["description"], int(values["featured"]), values["sort_order"], item_id),
    )
    db.replace_work_images(item_id, values["gallery_urls"])
    item = db.row("SELECT * FROM works WHERE id = ?", (item_id,))
    if not item:
        raise HTTPException(status_code=404, detail="作品集不存在")
    return db.normalize_work(item)


@app.delete("/api/v1/admin/works/{item_id}", dependencies=[Depends(require_admin)])
def delete_work(item_id: int):
    db.execute("DELETE FROM works WHERE id = ?", (item_id,))
    return {"ok": True}


@app.get("/api/v1/admin/posts", dependencies=[Depends(require_admin)])
def admin_posts():
    return [db.normalize_post(item) for item in db.rows("SELECT * FROM posts ORDER BY updated_at DESC")]


def post_values(payload: PostPayload):
    values = payload.dict()
    return (
        values["title"], values["slug"], values["excerpt"], values["content"],
        values["cover_url"], json.dumps(values["tags"], ensure_ascii=False),
        values["status"], values["published_at"],
    )


@app.post("/api/v1/admin/posts", dependencies=[Depends(require_admin)])
def create_post(payload: PostPayload):
    try:
        new_id = db.execute(
            "INSERT INTO posts (title, slug, excerpt, content, cover_url, tags, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            post_values(payload),
        )
    except Exception as error:
        raise HTTPException(status_code=400, detail="Slug 已存在或数据无效：{}".format(str(error)))
    item = db.row("SELECT * FROM posts WHERE id = ?", (new_id,))
    return db.normalize_post(item)


@app.put("/api/v1/admin/posts/{item_id}", dependencies=[Depends(require_admin)])
def update_post(item_id: int, payload: PostPayload):
    db.execute(
        "UPDATE posts SET title=?, slug=?, excerpt=?, content=?, cover_url=?, tags=?, status=?, published_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        post_values(payload) + (item_id,),
    )
    item = db.row("SELECT * FROM posts WHERE id = ?", (item_id,))
    return db.normalize_post(item)


@app.delete("/api/v1/admin/posts/{item_id}", dependencies=[Depends(require_admin)])
def delete_post(item_id: int):
    db.execute("DELETE FROM posts WHERE id = ?", (item_id,))
    return {"ok": True}


@app.get("/api/v1/admin/skills", dependencies=[Depends(require_admin)])
def admin_skills():
    return db.rows("SELECT * FROM skills ORDER BY id")


@app.post("/api/v1/admin/skills", dependencies=[Depends(require_admin)])
def create_skill(payload: SkillPayload):
    values = payload.dict()
    new_id = db.execute(
        "INSERT INTO skills (name, description, instructions, enabled) VALUES (?, ?, ?, ?)",
        (values["name"], values["description"], values["instructions"], int(values["enabled"])),
    )
    return db.row("SELECT * FROM skills WHERE id = ?", (new_id,))


@app.put("/api/v1/admin/skills/{item_id}", dependencies=[Depends(require_admin)])
def update_skill(item_id: int, payload: SkillPayload):
    values = payload.dict()
    db.execute(
        "UPDATE skills SET name=?, description=?, instructions=?, enabled=? WHERE id=?",
        (values["name"], values["description"], values["instructions"], int(values["enabled"]), item_id),
    )
    return db.row("SELECT * FROM skills WHERE id = ?", (item_id,))


@app.delete("/api/v1/admin/skills/{item_id}", dependencies=[Depends(require_admin)])
def delete_skill(item_id: int):
    db.execute("DELETE FROM skills WHERE id = ?", (item_id,))
    return {"ok": True}


@app.post("/api/v1/admin/upload", dependencies=[Depends(require_admin)])
async def upload_image(file: UploadFile = File(...)):
    allowed = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    suffix = allowed.get(file.content_type or "")
    if not suffix:
        raise HTTPException(status_code=400, detail="仅支持 JPG、PNG、WebP")
    content = await file.read(12 * 1024 * 1024 + 1)
    if len(content) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="图片不能超过 12MB")
    filename = "{}{}".format(uuid.uuid4().hex, suffix)
    (UPLOAD_DIR / filename).write_bytes(content)
    return {"url": "/uploads/{}".format(filename)}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
