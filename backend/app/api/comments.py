from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, Post, Comment, CommentLike, NotificationType
from app.schemas.schemas import CommentOut, CommentCreate
from app.auth.dependencies import get_current_user
from app.utils.serializers import serialize_user
from app.services.notification_service import notify

router = APIRouter(tags=["comments"])


def _serialize_comment(db: Session, comment: Comment, viewer: User) -> CommentOut:
    like_count = db.query(CommentLike).filter(CommentLike.comment_id == comment.id).count()
    is_liked = (
        db.query(CommentLike)
        .filter(CommentLike.comment_id == comment.id, CommentLike.user_id == viewer.id)
        .first()
        is not None
    )
    return CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        author=serialize_user(db, comment.author, viewer),
        body=comment.body,
        like_count=like_count,
        is_liked=is_liked,
        created_at=comment.created_at,
    )


@router.get("/posts/{post_id}/comments", response_model=list[CommentOut])
def list_comments(post_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.query(Post).filter(Post.id == post_id).first():
        raise HTTPException(status_code=404, detail="Post not found")

    comments = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.asc()).all()
    return [_serialize_comment(db, c, current_user) for c in comments]


@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    post_id: str, payload: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = Comment(
        post_id=post_id,
        author_id=current_user.id,
        parent_id=payload.parent_id,
        body=payload.body,
    )
    db.add(comment)
    notify(db, recipient_id=post.author_id, actor_id=current_user.id, ntype=NotificationType.comment, post_id=post_id)
    db.commit()
    db.refresh(comment)
    return _serialize_comment(db, comment, current_user)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Echo not found")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")

    db.delete(comment)
    db.commit()
    return


@router.post("/comments/{comment_id}/like", status_code=204)
def like_comment(comment_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.query(Comment).filter(Comment.id == comment_id).first():
        raise HTTPException(status_code=404, detail="Echo not found")

    existing = (
        db.query(CommentLike)
        .filter(CommentLike.comment_id == comment_id, CommentLike.user_id == current_user.id)
        .first()
    )
    if not existing:
        db.add(CommentLike(comment_id=comment_id, user_id=current_user.id))
        db.commit()
    return
