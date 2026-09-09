import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database.session import Base, engine
from app.database.migrations import run_sqlite_autopatch
from app.api import auth, users, posts, comments, messages, notifications, search
from app.api import media, moments, settings, ai, reports, rush, soundbox, flash, space_theme, admin

# Import models so they're registered on Base before create_all runs.
from app.models import models  # noqa: F401

Base.metadata.create_all(bind=engine)
run_sqlite_autopatch(engine, Base)

app = FastAPI(
    title="Flicksy API",
    description="REST API for the Flicksy social media app",
    version="1.0.0",
)

allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(messages.router)
app.include_router(notifications.router)
app.include_router(search.router)
app.include_router(media.router)
app.include_router(moments.router)
app.include_router(settings.router)
app.include_router(ai.router)
app.include_router(reports.router)
app.include_router(rush.router)
app.include_router(soundbox.router)
app.include_router(flash.router)
app.include_router(space_theme.router)
app.include_router(admin.router)

# Serve PUBLIC media locally in development. Only the public/ subdirectory is mounted —
# private/ (Flash) is deliberately NOT static-served; see GET /media/private/{filename} in
# app/api/media.py for authorized-only access. In production, swap MEDIA_STORAGE_BACKEND to a
# cloud provider (see app/services/media_service.py) and drop this mount.
_media_public_dir = os.path.join(os.getenv("MEDIA_LOCAL_DIR", "./media"), "public")
os.makedirs(_media_public_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=_media_public_dir), name="media")


@app.get("/")
def root():
    return {"status": "ok", "service": "flicksy-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}
