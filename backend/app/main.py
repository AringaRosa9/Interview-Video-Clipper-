from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import init_db
from app.routers.health import router as health_router
from app.routers.jobs import router as jobs_router
from app.routers.profiles import router as profiles_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Interview Highlight Clipper API", lifespan=lifespan)
    app.include_router(health_router, prefix="/api")
    app.include_router(profiles_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api")
    return app


app = create_app()
