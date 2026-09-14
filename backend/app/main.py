import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database.session import Base, engine, SessionLocal
from app.database.migrations import run_sqlite_autopatch
from app.api import auth, users, posts, comments, messages, notifications, search
from app.api import (
    media,
    moments,
    settings,
    ai,
    reports,
    rush,
    soundbox,
    flash,
    space_theme,
    admin,
    founder,
)
from app.services.founder_service import ensure_founder_seed

# Import models so they're registered on Base before create_all runs.
from app.models import models  # noqa: F401


# ---------------------------------------------------------------------------
# Database initialization
# ---------------------------------------------------------------------------

Base.metadata.create_all(bind=engine)
run_sqlite_autopatch(engine, Base)


# ---------------------------------------------------------------------------
# Founder seed
#
# Idempotent — only inserts/fills the founder profile when needed.
# Safe to run on every startup.
# ---------------------------------------------------------------------------

with SessionLocal() as _seed_db:
    ensure_founder_seed(_seed_db)


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Flicksy API",
    description="REST API for the Flicksy social media app",
    version="1.0.0",
)


# ---------------------------------------------------------------------------
# CORS configuration
#
# Supports:
# - Local React/Vite development
# - Capacitor Android/iOS WebView
# - Production Vercel frontend
# - Additional origins from CORS_ORIGINS environment variable
#
# Capacitor Android can use https://localhost as its WebView origin.
# This is important for authentication requests such as:
#   POST /auth/login
#   POST /auth/register
#   POST /auth/forgot-password
#
# Without https://localhost in the allowed origins, the browser sends
# an OPTIONS preflight request which FastAPI rejects with HTTP 400.
# ---------------------------------------------------------------------------

_default_origins = [
    # Local Vite development
    "http://localhost:5173",
    "http://localhost:3000",

    # Local browser / WebView variants
    "http://localhost",
    "https://localhost",

    # Capacitor variants
    "capacitor://localhost",
    "ionic://localhost",

    # Production frontend
    "https://flickzy-eight.vercel.app",
]


# Optional additional origins from Render environment variables.
#
# Example:
# CORS_ORIGINS=https://example.com,https://another-example.com
#
# Whitespace is removed and trailing "/" is removed so that origins
# are compared consistently.
_env_origins = os.getenv("CORS_ORIGINS", "")

_extra_origins = [
    origin.strip().rstrip("/")
    for origin in _env_origins.split(",")
    if origin.strip()
]


# Combine defaults + environment origins while removing duplicates.
_allowed_origins = list(
    dict.fromkeys(
        _default_origins + _extra_origins
    )
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Static media
#
# Only the public/ directory is mounted.
#
# Private media is served through authenticated endpoints in the media
# service rather than being exposed through this static mount.
# ---------------------------------------------------------------------------

_media_public_dir = os.path.join(
    os.path.dirname(__file__),
    "media",
    "public",
)

os.makedirs(_media_public_dir, exist_ok=True)

app.mount(
    "/media",
    StaticFiles(directory=_media_public_dir),
    name="media",
)


# ---------------------------------------------------------------------------
# API routers
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Health / root endpoint
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "flicksy-api",
    }
