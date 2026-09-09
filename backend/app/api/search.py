from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, Post
from app.schemas.schemas import UserPublic, PostOut
from app.auth.dependencies import get_current_user
from app.utils.serializers import serialize_user, serialize_post, get_hidden_private_author_ids

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/users", response_model=list[UserPublic])
def search_users(q: str = Query(min_length=1), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    like = f"%{q}%"
    rows = (
        db.query(User)
        .filter((User.username.ilike(like)) | (User.display_name.ilike(like)))
        .limit(20)
        .all()
    )
    return [serialize_user(db, u, current_user) for u in rows]


@router.get("/posts", response_model=list[PostOut])
def search_posts(q: str = Query(min_length=1), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    like = f"%{q}%"
    query = db.query(Post).filter(Post.caption.ilike(like)).order_by(Post.created_at.desc())

    hidden_authors = get_hidden_private_author_ids(db, current_user.id)
    if hidden_authors:
        query = query.filter(~Post.author_id.in_(hidden_authors))

    rows = query.limit(30).all()
    return [serialize_post(db, p, current_user) for p in rows]
