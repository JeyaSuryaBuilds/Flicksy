import os
import subprocess
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import SessionLocal, get_db
from app.models.models import User, Post, PostMedia
from app.schemas.schemas import PostOut, PostCreate, FeedResponse
from app.auth.dependencies import get_current_user
from app.utils.serializers import serialize_post, get_hidden_private_author_ids

router = APIRouter(prefix="/rush", tags=["rush"])

PAGE_SIZE = 10
MAX_RUSH_SECONDS = 90
PROCESSING_STATUS_READY = "ready"
PROCESSING_STATUS_PROCESSING = "processing"
PROCESSING_STATUS_FAILED = "failed"


def _get_local_public_path(media_url: str) -> tuple[Path, str]:
    if not media_url or not media_url.startswith("/media/"):
        raise ValueError("Rush media is not a local public media URL")

    filename = Path(media_url).name
    if filename != os.path.basename(filename):
        raise ValueError("Invalid media filename")

    media_root = Path(os.getenv("MEDIA_LOCAL_DIR", "./media")).resolve()
    public_dir = (media_root / "public").resolve()
    input_path = (public_dir / filename).resolve()

    if public_dir not in input_path.parents:
        raise ValueError("Invalid media path")
    if not input_path.exists() or not input_path.is_file():
        raise FileNotFoundError("Uploaded Rush video could not be found")

    return input_path, filename


def _probe_video_duration(media_url: str) -> Optional[float]:
    """Read duration without re-encoding. ffprobe is bundled with the FFmpeg package."""
    if not media_url.startswith("/media/"):
        return None

    try:
        input_path, _ = _get_local_public_path(media_url)
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(input_path),
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=15,
            check=False,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        raise HTTPException(
            status_code=500,
            detail="FFmpeg/ffprobe is not available on the server",
        )
    except (ValueError, OSError):
        raise HTTPException(status_code=400, detail="Couldn't inspect the Rush video")

    if result.returncode != 0:
        raise HTTPException(status_code=400, detail="Couldn't inspect the Rush video")

    try:
        return float(result.stdout.strip())
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Couldn't read the Rush video duration")


def _process_rush_videos(post_id: str, media_urls: list[str]) -> None:
    """Background worker: trim only videos that exceed 90 seconds, then swap the PostMedia URL."""
    db = SessionLocal()

    try:
        for media_url in media_urls:
            if not media_url.startswith("/media/"):
                continue

            input_path, filename = _get_local_public_path(media_url)
            if filename.startswith("rush90_"):
                continue

            output_filename = f"rush90_{uuid.uuid4().hex}.mp4"
            output_path = input_path.parent / output_filename

            result = subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(input_path),
                    "-t",
                    str(MAX_RUSH_SECONDS),
                    "-map",
                    "0:v:0",
                    "-map",
                    "0:a?",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "23",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "128k",
                    "-movflags",
                    "+faststart",
                    str(output_path),
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=300,
                check=False,
            )

            if result.returncode != 0 or not output_path.exists():
                if output_path.exists():
                    output_path.unlink(missing_ok=True)
                raise RuntimeError("Couldn't prepare the Rush video")

            media = (
                db.query(PostMedia)
                .filter(
                    PostMedia.post_id == post_id,
                    PostMedia.url == media_url,
                )
                .first()
            )
            if media is not None:
                media.url = f"/media/{output_filename}"

            input_path.unlink(missing_ok=True)

        post = db.query(Post).filter(Post.id == post_id).first()
        if post is not None:
            post.processing_status = PROCESSING_STATUS_READY
            post.processing_error = ""

        db.commit()

    except (FileNotFoundError, ValueError, subprocess.TimeoutExpired, OSError, RuntimeError) as exc:
        db.rollback()
        post = db.query(Post).filter(Post.id == post_id).first()
        if post is not None:
            post.processing_status = PROCESSING_STATUS_FAILED
            post.processing_error = str(exc)[:500]
            db.commit()
    finally:
        db.close()


@router.get("/feed", response_model=FeedResponse)
def get_rush_feed(
    cursor: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vertical Rush feed — filtered to Rush posts only."""
    query = (
        db.query(Post)
        .filter(Post.is_rush == True)  # noqa: E712
        .order_by(Post.created_at.desc())
    )

    if cursor:
        query = query.filter(Post.created_at < cursor)

    hidden_authors = get_hidden_private_author_ids(db, current_user.id)

    if hidden_authors:
        query = query.filter(~Post.author_id.in_(hidden_authors))

    posts = query.limit(PAGE_SIZE).all()

    next_cursor = (
        posts[-1].created_at.isoformat()
        if len(posts) == PAGE_SIZE
        else None
    )

    return FeedResponse(
        posts=[serialize_post(db, p, current_user) for p in posts],
        next_cursor=next_cursor,
    )


@router.post("", response_model=PostOut, status_code=201)
def create_rush(
    payload: PostCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.media_type != "video" or not payload.media_urls:
        raise HTTPException(
            status_code=400,
            detail="Rush requires an uploaded video",
        )

    needs_processing = False

    for url in payload.media_urls:
        if url.startswith("/media/"):
            duration = _probe_video_duration(url)
            if duration is not None and duration > MAX_RUSH_SECONDS:
                needs_processing = True

    processing_status = (
        PROCESSING_STATUS_PROCESSING
        if needs_processing
        else PROCESSING_STATUS_READY
    )

    post = Post(
        author_id=current_user.id,
        caption=payload.caption,
        location=payload.location,
        media_type="video",
        media_tag=payload.media_tag,
        is_rush=True,
        sound_id=payload.sound_id,
        processing_status=processing_status,
        processing_error="",
    )

    db.add(post)
    db.flush()

    for i, url in enumerate(payload.media_urls):
        db.add(
            PostMedia(
                post_id=post.id,
                url=url,
                order_index=i,
            )
        )

    db.commit()
    db.refresh(post)

    if needs_processing:
        background_tasks.add_task(
            _process_rush_videos,
            post.id,
            list(payload.media_urls),
        )

    return serialize_post(db, post, current_user)
