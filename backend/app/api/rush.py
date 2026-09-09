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


@router.get("/feed", response_model=FeedResponse)
def get_rush_feed(
    cursor: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vertical Rush feed — same pagination shape as the Stream, filtered to is_rush posts only."""
    query = db.query(Post).filter(Post.is_rush == True).order_by(Post.created_at.desc())  # noqa: E712
    if cursor:
        query = query.filter(Post.created_at < cursor)

    hidden_authors = get_hidden_private_author_ids(db, current_user.id)
    if hidden_authors:
        query = query.filter(~Post.author_id.in_(hidden_authors))

    posts = query.limit(PAGE_SIZE).all()
    next_cursor = posts[-1].created_at.isoformat() if len(posts) == PAGE_SIZE else None
    return FeedResponse(posts=[serialize_post(db, p, current_user) for p in posts], next_cursor=next_cursor)


@router.post("", response_model=PostOut, status_code=201)
def create_rush(payload: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.media_type != "video" or not payload.media_urls:
        raise HTTPException(status_code=400, detail="Rush requires an uploaded video")

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
    for i, url in enumerate(payload.media_urls):
        db.add(PostMedia(post_id=post.id, url=url, order_index=i))
    db.commit()
    db.refresh(post)
    return serialize_post(db, post, current_user)
