import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

from auth import hash_password


def database_path() -> Path:
    configured = os.environ.get("DATABASE_PATH")
    path = Path(configured) if configured else Path(__file__).parent / "data" / "kailens.db"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(str(database_path()))
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def rows(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    with connect() as connection:
        return [dict(item) for item in connection.execute(query, params).fetchall()]


def row(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    with connect() as connection:
        item = connection.execute(query, params).fetchone()
        return dict(item) if item else None


def execute(query: str, params: tuple = ()) -> int:
    with connect() as connection:
        cursor = connection.execute(query, params)
        connection.commit()
        return int(cursor.lastrowid)


def normalize_post(item: Dict[str, Any]) -> Dict[str, Any]:
    item["tags"] = json.loads(item.get("tags") or "[]")
    return item


def normalize_work(item: Dict[str, Any]) -> Dict[str, Any]:
    item["gallery_urls"] = [
        image["image_url"]
        for image in rows(
            "SELECT image_url FROM work_images WHERE work_id = ? ORDER BY sort_order, id",
            (item["id"],),
        )
    ]
    return item


def replace_work_images(work_id: int, image_urls: List[str]) -> None:
    normalized_urls: List[str] = []
    for image_url in image_urls:
        clean_url = image_url.strip()
        if clean_url and clean_url not in normalized_urls:
            normalized_urls.append(clean_url)
    with connect() as connection:
        connection.execute("DELETE FROM work_images WHERE work_id = ?", (work_id,))
        connection.executemany(
            "INSERT INTO work_images (work_id, image_url, sort_order) VALUES (?, ?, ?)",
            [(work_id, image_url, index) for index, image_url in enumerate(normalized_urls)],
        )
        connection.commit()


def init_database() -> None:
    with connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS works (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL, category TEXT NOT NULL, location TEXT NOT NULL,
                year TEXT NOT NULL, image_url TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
                featured INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS work_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_id INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_work_images_work_id
                ON work_images(work_id, sort_order, id);
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, excerpt TEXT NOT NULL,
                content TEXT NOT NULL, cover_url TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'draft', published_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL, description TEXT NOT NULL, instructions TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            """
        )
        if connection.execute("SELECT COUNT(*) FROM works").fetchone()[0] == 0:
            connection.executemany(
                "INSERT INTO works (title, category, location, year, image_url, description, featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    ("山雾之前", "风景", "川西", "2025", "/images/work-1.jpg", "清晨六点，风把雾推过山脊。", 1, 1),
                    ("无声街角", "街头", "上海", "2025", "/images/work-2.jpg", "雨后的街灯，让城市暂时慢下来。", 1, 2),
                    ("海岸线", "旅行", "福建", "2024", "/images/work-3.jpg", "潮水退去后，沙滩保留着短暂的纹理。", 1, 3),
                    ("午后窗口", "人像", "北京", "2025", "/images/work-4.jpg", "自然光下的一次安静练习。", 0, 4),
                    ("向北", "旅行", "青海", "2024", "/images/work-5.jpg", "公路尽头仍然是公路。", 0, 5),
                    ("树影来信", "自然", "杭州", "2025", "/images/work-6.jpg", "叶片把阳光切成细小的句子。", 0, 6),
                ],
            )
        if connection.execute("SELECT COUNT(*) FROM posts").fetchone()[0] == 0:
            connection.executemany(
                "INSERT INTO posts (title, slug, excerpt, content, cover_url, tags, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    ("在陌生城市里练习观察", "practice-seeing", "一次没有拍摄清单的城市漫步，以及我如何重新找到观看的节奏。", "## 不带答案出门\n\n摄影最迷人的部分，是它允许你在没有结论的时候出发。那天我只带了一支 35mm 镜头，没有目的地，也没有必须完成的照片。\n\n> 与其寻找所谓的决定性瞬间，我更愿意等待一个普通瞬间变得值得记住。\n\n## 给自己三个限制\n\n- 不重复走同一条路\n- 每个街区只拍十二张\n- 日落前不查看照片\n\n限制让注意力变得具体，也让拍摄从收集变成选择。", "/images/blog-1.jpg", json.dumps(["摄影", "街头", "随笔"], ensure_ascii=False), "published", "2026-08-16T10:00:00Z"),
                    ("我的轻量摄影工作流", "lightweight-photo-workflow", "从备份、筛选到导出，一套适合个人项目的低负担流程。", "## 一套能长期执行的流程\n\n工具越多，不代表作品越好。我现在只保留四个步骤：双盘备份、第一次快速筛选、隔夜复选、按用途导出。\n\n## 关于文件名\n\n我使用 `年份-项目-序号` 的结构，让照片在离开任何软件后仍然可读。网站只存放经过压缩的展示版本，原始文件永远留在本地和冷备份中。", "/images/blog-2.jpg", json.dumps(["工作流", "摄影", "技术"], ensure_ascii=False), "published", "2026-07-02T10:00:00Z"),
                ],
            )
        if connection.execute("SELECT COUNT(*) FROM skills").fetchone()[0] == 0:
            connection.executemany(
                "INSERT INTO skills (name, description, instructions, enabled) VALUES (?, ?, ?, ?)",
                [
                    ("摄影散步策划", "根据时间、地点和主题设计一次可执行的摄影散步。", "你是一位有经验的街头摄影导师。回答要具体、克制，给出路线思路、观察任务和安全提醒。", 1),
                    ("博客编辑", "把零散想法整理成结构清晰、保留个人语气的文章。", "你是一位中文编辑。保留作者的个人语气，避免空洞表达，优先给出结构和可执行的修改建议。", 1),
                    ("技术解释", "用简单语言解释摄影或 Web 开发中的技术概念。", "你擅长把技术概念解释给初学者。先给结论，再用一个类比和一个小例子说明。", 1),
                ],
            )
        if connection.execute("SELECT value FROM settings WHERE key = 'admin_password'").fetchone() is None:
            password = os.environ.get("ADMIN_PASSWORD", "")
            if not password:
                if os.environ.get("ENVIRONMENT") == "production":
                    raise RuntimeError("ADMIN_PASSWORD is required on first production startup")
                password = "kailens-local"
            connection.execute("INSERT INTO settings (key, value) VALUES ('admin_password', ?)", (hash_password(password),))
        connection.commit()
