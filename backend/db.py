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
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT
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
            CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            """
        )
        work_columns = {
            item["name"] for item in connection.execute("PRAGMA table_info(works)").fetchall()
        }
        if "deleted_at" not in work_columns:
            connection.execute("ALTER TABLE works ADD COLUMN deleted_at TEXT")
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_works_deleted_at ON works(deleted_at)"
        )
        if connection.execute("SELECT value FROM settings WHERE key = 'admin_password'").fetchone() is None:
            password = os.environ.get("ADMIN_PASSWORD", "")
            if not password:
                if os.environ.get("ENVIRONMENT") == "production":
                    raise RuntimeError("ADMIN_PASSWORD is required on first production startup")
                password = "kailens-local"
            connection.execute("INSERT INTO settings (key, value) VALUES ('admin_password', ?)", (hash_password(password),))
        connection.commit()
