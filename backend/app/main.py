from contextlib import asynccontextmanager
import sqlite3

from fastapi import FastAPI

from app.core.config import get_settings
from app.db import init_db
from app.routers.health import router as health_router
from app.routers.jobs import router as jobs_router
from app.routers.profiles import router as profiles_router


def _database_path() -> str:
    database_url = get_settings().database_url
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        raise ValueError("Only sqlite:/// database URLs are supported")
    return database_url.removeprefix(prefix)


def init_job_storage() -> None:
    with sqlite3.connect(_database_path()) as connection:
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


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    init_job_storage()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Interview Highlight Clipper API", lifespan=lifespan)
    app.include_router(health_router, prefix="/api")
    app.include_router(profiles_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api")
    return app


app = create_app()
