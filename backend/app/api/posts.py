from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, Post, PostMedia, Like, Bookmark, NotificationType
from app.schemas.schemas import PostOut, PostCreate, FeedResponse
from app.auth.dependencies import get_current_user
from app.utils.serializers import serialize_post, get_hidden_private_author_ids
from app.utils.mentions import extract_mentioned_usernames, notify_mentioned_users
from app.services.notification_service import notify

router = APIRouter(prefix="/posts", tags=["posts"])

PAGE_SIZE = 10


@router.get("/feed", response_model=FeedResponse)
def get_feed(
    cursor: Optional[str] = Query(default=None, description="ISO timestamp cursor for pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Post).filter(Post.is_archived == False).order_by(Post.created_at.desc())  # noqa: E712
    if cursor:
        query = query.filter(Post.created_at < cursor)

    hidden_authors = get_hidden_private_author_ids(db, current_user.id)
    if hidden_authors:
        query = query.filter(~Post.author_id.in_(hidden_authors))

    posts = query.limit(PAGE_SIZE).all()
    next_cursor = posts[-1].created_at.isoformat() if len(posts) == PAGE_SIZE else None

    return FeedResponse(
        posts=[serialize_post(db, p, current_user) for p in posts],
        next_cursor=next_cursor,
    )


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id in get_hidden_private_author_ids(db, current_user.id):
        raise HTTPException(status_code=403, detail="This Space is private")
    if post.is_archived and post.author_id != current_user.id:
        raise HTTPException(status_code=404, detail="Post not found")
    return serialize_post(db, post, current_user)


@router.post("", response_model=PostOut, status_code=201)
def create_post(payload: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = Post(
        author_id=current_user.id,
        caption=payload.caption,
        location=payload.location,
        media_type=payload.media_type,
        media_tag=payload.media_tag,
    )
    db.add(post)
    db.flush()

    for i, url in enumerate(payload.media_urls):
        db.add(PostMedia(post_id=post.id, url=url, order_index=i))

    notify_mentioned_users(db, payload.caption, actor=current_user, post_id=post.id)

    db.commit()
    db.refresh(post)
    return serialize_post(db, post, current_user)


@router.put("/{post_id}", response_model=PostOut)
def update_post(
    post_id: str, payload: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own posts")

    previously_mentioned = set(extract_mentioned_usernames(post.caption))
    post.caption = payload.caption
    post.location = payload.location
    newly_mentioned = set(extract_mentioned_usernames(payload.caption)) - previously_mentioned
    if newly_mentioned:
        notify_mentioned_users(db, " ".join(f"@{u}" for u in newly_mentioned), actor=current_user, post_id=post.id)
    db.commit()
    db.refresh(post)
    return serialize_post(db, post, current_user)


@router.delete("/{post_id}", status_code=204)
def delete_post(post_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own posts")

    db.delete(post)
    db.commit()
    return


@router.post("/{post_id}/archive", response_model=PostOut)
def archive_post(post_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only archive your own posts")

    post.is_archived = True
    db.commit()
    db.refresh(post)
    return serialize_post(db, post, current_user)


@router.post("/{post_id}/unarchive", response_model=PostOut)
def unarchive_post(post_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only unarchive your own posts")

    post.is_archived = False
    db.commit()
    db.refresh(post)
    return serialize_post(db, post, current_user)


@router.post("/{post_id}/pin", response_model=PostOut)
def pin_post(post_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only pin your own posts")

    post.is_pinned = True
    post.pinned_at = datetime.utcnow()
    db.commit()
    db.refresh(post)
    return serialize_post(db, post, current_user)


@router.post("/{post_id}/unpin", response_model=PostOut)
def unpin_post(post_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only unpin your own posts")

    post.is_pinned = False
    post.pinned_at = None
    db.commit()
    db.refresh(post)
    return serialize_post(db, post, current_user)


@router.post("/{post_id}/like", status_code=204)
def like_post(post_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    if not existing:
        db.add(Like(post_id=post_id, user_id=current_user.id))
        notify(db, recipient_id=post.author_id, actor_id=current_user.id, ntype=NotificationType.like, post_id=post_id)
        db.commit()
    return


@router.delete("/{post_id}/like", status_code=204)
def unlike_post(post_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        db.commit()
    return


@router.post("/{post_id}/bookmark", status_code=204)
def bookmark_post(post_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.query(Post).filter(Post.id == post_id).first():
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(Bookmark).filter(Bookmark.post_id == post_id, Bookmark.user_id == current_user.id).first()
    if not existing:
        db.add(Bookmark(post_id=post_id, user_id=current_user.id))
        db.commit()
    return


@router.delete("/{post_id}/bookmark", status_code=204)
def unbookmark_post(post_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Bookmark).filter(Bookmark.post_id == post_id, Bookmark.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        db.commit()
    return