import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database.session import Base, engine, SessionLocal
from app.database.migrations import run_sqlite_autopatch
from app.api import auth, users, posts, comments, messages, notifications, search
from app.api import media, moments, settings, ai, reports, rush, soundbox, flash, space_theme, admin, founder
from app.services.founder_service import ensure_founder_seed

# Import models so they're registered on Base before create_all runs.
from app.models import models  # noqa: F401


Base.metadata.create_all(bind=engine)
run_sqlite_autopatch(engine, Base)

# Idempotent — only inserts the founder profile if none exists yet. Safe to run
# on every startup, never overwrites existing (including admin-edited) data.
with SessionLocal() as _seed_db:
    ensure_founder_seed(_seed_db)


app = FastAPI(
    title="Flicksy API",
    description="REST API for the Flicksy social media app",
    version="1.0.0",
)


# CORS configuration
# Supports:
# - Local React/Vite development
# - Capacitor Android/iOS WebView
# - Production frontend origin(s) via CORS_ORIGINS env var (comma-separated)
_default_origins = ["http://localhost:5173", "http://localhost:3000", "capacitor://localhost", "http://localhost"]
_env_origins = os.getenv("CORS_ORIGINS", "")
_extra_origins = [o.strip() for o in _env_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _extra_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static media
#
# Only the public/ subdirectory is mounted — private media (Flash, private
# posts) is served through an authenticated endpoint that checks ownership
# (see app/services/media_service.py) and drop this mount.
# ---------------------------------------------------------------------------
_media_public_dir = os.path.join(os.path.dirname(__file__), "media", "public")
os.makedirs(_media_public_dir, exist_ok=True)
app.mount(
    "/media",
    StaticFiles(directory=_media_public_dir),
    name="media",
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
app.include_router(founder.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "flicksy-api"}