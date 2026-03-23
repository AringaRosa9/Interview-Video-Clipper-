from fastapi import FastAPI

from app.routers.health import router as health_router

app = FastAPI(title="Interview Highlight Clipper API")
app.include_router(health_router, prefix="/api")
