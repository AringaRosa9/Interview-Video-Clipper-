import sqlite3
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

from app.core.config import get_settings


def database_path() -> Path:
    database_url = get_settings().database_url
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        raise ValueError("Only sqlite:/// database URLs are supported")
    return Path(database_url.removeprefix(prefix))


def init_db() -> None:
    db_path = database_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(db_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                base_url TEXT NOT NULL,
                api_key_obscured TEXT NOT NULL,
                model TEXT NOT NULL,
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_url TEXT NOT NULL,
                candidate_name TEXT NOT NULL,
                profile_id INTEGER NOT NULL,
                target_duration_seconds INTEGER NOT NULL,
                status TEXT NOT NULL,
                workspace_path TEXT NOT NULL,
                failure_message TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(profile_id) REFERENCES profiles(id)
            )
            """
        )
        connection.commit()


@contextmanager
def get_connection() -> Generator[sqlite3.Connection, None, None]:
    init_db()
    connection = sqlite3.connect(database_path())
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def get_db() -> Generator[sqlite3.Connection, None, None]:
    with get_connection() as connection:
        yield connection
