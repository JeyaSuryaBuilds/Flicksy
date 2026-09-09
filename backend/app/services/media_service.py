"""
Media upload/storage service.

QUALITY POLICY: uploaded files are persisted byte-for-byte as received — no resizing,
recompression, or transcoding of any kind. Original resolution, FPS, bitrate, aspect
ratio, and (for GIFs) animation are preserved exactly because we never touch the bytes.
If optimized preview/thumbnail generation is added later, it must write to a SEPARATE
file/URL and never overwrite or replace the original upload referenced here.

SECURITY POLICY: uploads are split into two storage areas —
  public/  — Flicks, Rush, Moments, Avatars, SoundBox: served directly via FastAPI
             StaticFiles, world-readable by design (that's the intended visibility).
  private/ — Flash and other explicitly-private media: NOT mounted as static files.
             Served only through GET /media/private/{filename}, which checks the
             requester is actually a party to the FlashMessage referencing that file.
"""
import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

MEDIA_STORAGE_BACKEND = os.getenv("MEDIA_STORAGE_BACKEND", "local")
MEDIA_LOCAL_DIR = Path(os.getenv("MEDIA_LOCAL_DIR", "./media"))
MEDIA_PUBLIC_BASE_URL = os.getenv("MEDIA_PUBLIC_BASE_URL", "/media")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}
MAX_IMAGE_BYTES = 15 * 1024 * 1024   # 15MB
MAX_VIDEO_BYTES = 200 * 1024 * 1024  # 200MB

PUBLIC_DIR = MEDIA_LOCAL_DIR / "public"
PRIVATE_DIR = MEDIA_LOCAL_DIR / "private"
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
PRIVATE_DIR.mkdir(parents=True, exist_ok=True)


def _safe_extension(filename: str, content_type: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext and len(ext) <= 6 and ext.replace(".", "").isalnum():
        return ext
    return {
        "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
        "video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm",
    }.get(content_type, "")


async def save_upload(file: UploadFile, kind: str, visibility: str = "public") -> dict:
    """
    Validate and persist an uploaded file. Returns {"url": ..., "content_type": ..., "size": ...}.
    `kind` is "image" or "video". `visibility` is "public" (default — Flicks/Rush/Moments/
    Avatars/SoundBox) or "private" (Flash) — controls which directory it lands in and therefore
    whether it's reachable by anyone with the URL or only through an authorized endpoint.
    """
    if kind not in ("image", "video"):
        raise HTTPException(status_code=400, detail="kind must be 'image' or 'video'")
    if visibility not in ("public", "private"):
        raise HTTPException(status_code=400, detail="visibility must be 'public' or 'private'")

    allowed_types = ALLOWED_IMAGE_TYPES if kind == "image" else ALLOWED_VIDEO_TYPES
    max_bytes = MAX_IMAGE_BYTES if kind == "image" else MAX_VIDEO_BYTES

    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported {kind} type: {file.content_type}")

    contents = await file.read()
    if len(contents) > max_bytes:
        raise HTTPException(status_code=400, detail=f"{kind.capitalize()} exceeds the {max_bytes // (1024*1024)}MB limit")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Server-generated filename — the user-supplied filename is never trusted or used for
    # the path, which also rules out path traversal.
    ext = _safe_extension(file.filename or "", file.content_type)
    secure_name = f"{uuid.uuid4().hex}{ext}"

    if MEDIA_STORAGE_BACKEND == "local":
        if visibility == "public":
            dest = PUBLIC_DIR / secure_name
            with open(dest, "wb") as f:
                f.write(contents)
            url = f"{MEDIA_PUBLIC_BASE_URL}/{secure_name}"
        else:
            dest = PRIVATE_DIR / secure_name
            with open(dest, "wb") as f:
                f.write(contents)
            url = f"{MEDIA_PUBLIC_BASE_URL}/private/{secure_name}"
    else:
        # Placeholder branch for S3/Cloudinary/Supabase — swap in the real SDK call here.
        # Keeping the interface identical (return a URL string) means no caller changes needed.
        raise HTTPException(
            status_code=501,
            detail=f"MEDIA_STORAGE_BACKEND={MEDIA_STORAGE_BACKEND} is not implemented yet. Use 'local' for development.",
        )

    return {"url": url, "content_type": file.content_type, "size": len(contents)}


def resolve_private_file_path(filename: str) -> Path:
    """Prevents path traversal: only a bare filename (no separators) resolved strictly
    inside PRIVATE_DIR is ever returned."""
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = (PRIVATE_DIR / filename).resolve()
    if PRIVATE_DIR.resolve() not in path.parents and path != PRIVATE_DIR.resolve():
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return path
