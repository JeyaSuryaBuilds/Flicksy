import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, Post, PostMedia
from app.schemas.schemas import PostOut, PostCreate, FeedResponse
from app.auth.dependencies import get_current_user
from app.utils.serializers import serialize_post, get_hidden_private_author_ids

router = APIRouter(prefix="/rush", tags=["rush"])

PAGE_SIZE = 10
MAX_RUSH_SECONDS = 90


def trim_video_to_90_seconds(media_url: str) -> str:
    """
    If the uploaded video is longer than 90 seconds,
    create a trimmed MP4 containing only the first 90 seconds.

    Returns the media URL that should be stored in PostMedia.
    """

    if not media_url:
        raise HTTPException(
            status_code=400,
            detail="Rush video is missing",
        )

    # Only local /media URLs can be processed directly here.
    if not media_url.startswith("/media/"):
        return media_url

    filename = Path(media_url).name

    # Prevent path traversal.
    if filename != os.path.basename(filename):
        raise HTTPException(
            status_code=400,
            detail="Invalid media filename",
        )

    media_root = Path(
        os.getenv("MEDIA_LOCAL_DIR", "./media")
    ).resolve()

    input_path = (
        media_root / "public" / filename
    ).resolve()

    if not input_path.exists() or not input_path.is_file():
        raise HTTPException(
            status_code=400,
            detail="Uploaded Rush video could not be found",
        )

    # Don't trim a file that has already been processed.
    if filename.startswith("rush90_"):
        return media_url

    output_filename = f"rush90_{filename.rsplit('.', 1)[0]}.mp4"
    output_path = (
        media_root / "public" / output_filename
    ).resolve()

    # Make sure the final path remains inside media/public.
    public_dir = (media_root / "public").resolve()

    if public_dir not in output_path.parents:
        raise HTTPException(
            status_code=400,
            detail="Invalid output media path",
        )

    try:
        # -t 90 = first 90 seconds
        # -c:v libx264 = broadly compatible H.264 video
        # -c:a aac = broadly compatible audio
        # -movflags +faststart = better streaming/mobile playback
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
        )

        if result.returncode != 0 or not output_path.exists():
            if output_path.exists():
                output_path.unlink(missing_ok=True)

            raise HTTPException(
                status_code=400,
                detail="Couldn't prepare the Rush video",
            )

        # Remove original uploaded file after successful trim.
        # The trimmed MP4 becomes the actual Rush media.
        if input_path != output_path:
            input_path.unlink(missing_ok=True)

        return f"/media/{output_filename}"

    except subprocess.TimeoutExpired:
        if output_path.exists():
            output_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=408,
            detail="Video processing took too long",
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="FFmpeg is not installed on the server",
        )


@router.get("/feed", response_model=FeedResponse)
def get_rush_feed(
    cursor: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vertical Rush feed — same pagination shape as the Stream, filtered to is_rush posts only."""

    query = (
        db.query(Post)
        .filter(Post.is_rush == True)  # noqa: E712
        .order_by(Post.created_at.desc())
    )

    if cursor:
        query = query.filter(Post.created_at < cursor)

    hidden_authors = get_hidden_private_author_ids(
        db,
        current_user.id,
    )

    if hidden_authors:
        query = query.filter(
            ~Post.author_id.in_(hidden_authors)
        )

    posts = query.limit(PAGE_SIZE).all()

    next_cursor = (
        posts[-1].created_at.isoformat()
        if len(posts) == PAGE_SIZE
        else None
    )

    return FeedResponse(
        posts=[
            serialize_post(db, p, current_user)
            for p in posts
        ],
        next_cursor=next_cursor,
    )


@router.post(
    "",
    response_model=PostOut,
    status_code=201,
)
def create_rush(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.media_type != "video" or not payload.media_urls:
        raise HTTPException(
            status_code=400,
            detail="Rush requires an uploaded video",
        )

    processed_media_urls = []

    for url in payload.media_urls:
        processed_url = trim_video_to_90_seconds(url)
        processed_media_urls.append(processed_url)

    post = Post(
        author_id=current_user.id,
        caption=payload.caption,
        location=payload.location,
        media_type="video",
        media_tag=payload.media_tag,
        is_rush=True,
        sound_id=payload.sound_id,
    )

    db.add(post)
    db.flush()

    for i, url in enumerate(processed_media_urls):
        db.add(
            PostMedia(
                post_id=post.id,
                url=url,
                order_index=i,
            )
        )

    db.commit()
    db.refresh(post)

    return serialize_post(
        db,
        post,
        current_user,
    )