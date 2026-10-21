import json
import logging
import os
import uuid
from io import BytesIO
from pathlib import Path
from typing import Dict, Optional

import uvicorn
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from media import PhotographyFiles

import db
from auth import create_token, hash_password, require_admin, verify_password
from schemas import PortfolioSettingsPayload, LoginRequest, PasswordRequest, WorkPayload

LOGGER = logging.getLogger(__name__)
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", str(BASE_DIR / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_PORTFOLIO_SETTINGS = {
    "name": "KAI LENS", "subtitle": "个人摄影作品集",
    "title": "目之所及，皆为故事。",
    "description": "走过的地方，遇见的人，和不想遗忘的日常。",
    "contact": "", "featured_work_id": None,
}

app = FastAPI(title="Kai Lens API", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[item.strip() for item in os.environ.get("CORS_ORIGINS", "*").split(",")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", PhotographyFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.on_event("startup")
def startup() -> None:
    db.init_database()


@app.get("/api/v1/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


def read_portfolio_settings():
    setting = db.row("SELECT value FROM settings WHERE key = 'portfolio'")
    saved = {}
    if setting:
        try:
            saved = json.loads(setting["value"])
        except (TypeError, json.JSONDecodeError):
            LOGGER.warning("Invalid portfolio settings; using defaults")
    return PortfolioSettingsPayload(**{**DEFAULT_PORTFOLIO_SETTINGS, **saved}).dict()


@app.get("/api/v1/portfolio-settings")
def public_portfolio_settings():
    return read_portfolio_settings()


@app.get("/api/v1/works")
def public_works():
    return [
        db.normalize_work(item)
        for item in db.rows(
            "SELECT * FROM works WHERE deleted_at IS NULL AND image_url NOT LIKE '/images/%' ORDER BY sort_order, id DESC"
        )
    ]


@app.get("/api/v1/works/page")
def public_work_page(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=48),
    category: Optional[str] = Query(None, max_length=40),
):
    base = "deleted_at IS NULL AND image_url NOT LIKE '/images/%'"
    where = base
    params = ()
    if category:
        where += " AND category = ?"
        params = (category,)
    total = db.row("SELECT COUNT(*) AS count FROM works WHERE " + where, params)["count"]
    total_all = db.row("SELECT COUNT(*) AS count FROM works WHERE " + base)["count"]
    total_pages = max(1, (total + page_size - 1) // page_size)
    current = min(page, total_pages)
    items = db.rows(
        "SELECT * FROM works WHERE " + where + " ORDER BY sort_order, id DESC LIMIT ? OFFSET ?",
        params + (page_size, (current - 1) * page_size),
    )
    categories = db.rows("SELECT category, COUNT(*) AS count FROM works WHERE " + base + " AND category != '' GROUP BY category ORDER BY category")
    featured_id = read_portfolio_settings()["featured_work_id"]
    featured = db.row("SELECT * FROM works WHERE " + base + " AND id = ?", (featured_id,)) if featured_id else None
    if not featured:
        featured = db.row("SELECT * FROM works WHERE " + base + " ORDER BY CASE WHEN featured = 1 AND category = '旅游' THEN 0 WHEN featured = 1 THEN 1 ELSE 2 END, sort_order, id DESC LIMIT 1")
    return {
        "items": [db.normalize_work(item) for item in items],
        "total": total, "total_all": total_all, "page": current,
        "page_size": page_size, "total_pages": total_pages,
        "categories": categories,
        "featured": db.normalize_work(featured) if featured else None,
    }


@app.get("/api/v1/works/{item_id}")
def public_work(item_id: int):
    item = db.row(
        "SELECT * FROM works WHERE id = ? AND deleted_at IS NULL AND image_url NOT LIKE '/images/%'", (item_id,)
    )
    if not item:
        raise HTTPException(status_code=404, detail="作品集不存在")
    return db.normalize_work(item)


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


@app.get("/api/v1/admin/portfolio-settings", dependencies=[Depends(require_admin)])
def admin_portfolio_settings():
    return read_portfolio_settings()


@app.put("/api/v1/admin/portfolio-settings", dependencies=[Depends(require_admin)])
def update_portfolio_settings(payload: PortfolioSettingsPayload):
    if payload.featured_work_id is not None:
        work = db.row("SELECT id FROM works WHERE id = ? AND deleted_at IS NULL AND image_url NOT LIKE '/images/%'", (payload.featured_work_id,))
        if not work:
            raise HTTPException(status_code=400, detail="请选择一个有效的个人作品集")
    values = payload.dict()
    db.execute("INSERT INTO settings (key, value) VALUES ('portfolio', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (json.dumps(values, ensure_ascii=False),))
    return values


@app.get("/api/v1/admin/works", dependencies=[Depends(require_admin)])
def admin_works():
    return [
        db.normalize_work(item)
        for item in db.rows(
            "SELECT * FROM works WHERE deleted_at IS NULL AND image_url NOT LIKE '/images/%' ORDER BY sort_order, id DESC"
        )
    ]


@app.get("/api/v1/admin/trash/works", dependencies=[Depends(require_admin)])
def trashed_works():
    return [
        db.normalize_work(item)
        for item in db.rows(
            "SELECT * FROM works WHERE deleted_at IS NOT NULL AND image_url NOT LIKE '/images/%' ORDER BY deleted_at DESC, id DESC"
        )
    ]


@app.post("/api/v1/admin/trash/works/{item_id}/restore", dependencies=[Depends(require_admin)])
def restore_work(item_id: int):
    item = db.row(
        "SELECT * FROM works WHERE id = ? AND deleted_at IS NOT NULL", (item_id,)
    )
    if not item:
        raise HTTPException(status_code=404, detail="回收站中没有这个作品集")
    db.execute("UPDATE works SET deleted_at = NULL WHERE id = ?", (item_id,))
    return db.normalize_work(db.row("SELECT * FROM works WHERE id = ?", (item_id,)))


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
    item = db.row(
        "SELECT * FROM works WHERE id = ? AND deleted_at IS NULL AND image_url NOT LIKE '/images/%'", (item_id,)
    )
    if not item:
        raise HTTPException(status_code=404, detail="作品集不存在")
    values = payload.dict()
    db.execute(
        "UPDATE works SET title=?, category=?, location=?, year=?, image_url=?, description=?, featured=?, sort_order=? WHERE id=?",
        (values["title"], values["category"], values["location"], values["year"], values["image_url"], values["description"], int(values["featured"]), values["sort_order"], item_id),
    )
    db.replace_work_images(item_id, values["gallery_urls"])
    item = db.row("SELECT * FROM works WHERE id = ?", (item_id,))
    return db.normalize_work(item)


@app.delete("/api/v1/admin/works/{item_id}", dependencies=[Depends(require_admin)])
def delete_work(item_id: int):
    item = db.row(
        "SELECT id FROM works WHERE id = ? AND deleted_at IS NULL AND image_url NOT LIKE '/images/%'", (item_id,)
    )
    if not item:
        raise HTTPException(status_code=404, detail="作品集不存在")
    db.execute(
        "UPDATE works SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", (item_id,)
    )
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
    try:
        with Image.open(BytesIO(content)) as image:
            if image.width * image.height > 60_000_000:
                raise HTTPException(status_code=400, detail="图片像素过大，请先缩小到 6000 万像素以内")
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError):
        raise HTTPException(status_code=400, detail="图片内容无效或已损坏，请重新导出后上传")
    filename = "{}{}".format(uuid.uuid4().hex, suffix)
    (UPLOAD_DIR / filename).write_bytes(content)
    return {"url": "/uploads/{}".format(filename)}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
