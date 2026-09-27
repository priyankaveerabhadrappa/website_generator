"""Long-term memory: candidate preferences and past applications (SQLite)."""

import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime

from .config import STATE_DIR

DB_PATH = STATE_DIR / "memory.sqlite"


@contextmanager
def _connect():
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS applications (
            slug TEXT PRIMARY KEY,
            company TEXT NOT NULL,
            position TEXT NOT NULL,
            summary TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _now() -> str:
    return datetime.now(UTC).isoformat()


def list_preferences() -> list[dict]:
    with _connect() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM preferences ORDER BY id")]


def add_preference(text: str) -> dict:
    with _connect() as conn:
        cur = conn.execute("INSERT INTO preferences (text, created_at) VALUES (?, ?)", (text.strip(), _now()))
        return {"id": cur.lastrowid, "text": text.strip()}


def delete_preference(pref_id: int) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM preferences WHERE id = ?", (pref_id,))


def record_application(slug: str, company: str, position: str, summary: dict) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO applications VALUES (?, ?, ?, ?, ?)",
            (slug, company, position, json.dumps(summary), _now()),
        )


def list_applications(limit: int = 10) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM applications ORDER BY created_at DESC LIMIT ?", (limit,))
        return [{**dict(r), "summary": json.loads(r["summary"])} for r in rows]
