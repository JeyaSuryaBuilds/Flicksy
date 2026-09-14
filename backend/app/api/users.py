from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, Follow, Post, normalize_flicktag, NotificationType
from app.schemas.schemas import UserPublic, UserUpdate, FlickTagAvailability, PostOut
from app.auth.dependencies import get_current_user, get_current_admin
from app.utils.serializers import serialize_user, serialize_post, get_hidden_private_author_ids
from app.services.notification_service import notify

router = APIRouter(prefix="/users", tags=["users"])


def _get_user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/flicktag-available", response_model=FlickTagAvailability)
def check_flicktag_available(
    username: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Live availability check used while editing a FlickTag in Edit Space."""
    tag = normalize_flicktag(username)
    existing = db.query(User).filter(User.username == tag).first()
    available = existing is None or existing.id == current_user.id
    return FlickTagAvailability(username=tag, available=available)


@router.get("/mentionable", response_model=list[UserPublic])
def get_mentionable_users(
    q: str = "", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Real @mention autocomplete — only ever suggests people from the current
    user's actual Crew (followers) or Circles (following), matched against the
    live database, never fake/static suggestions."""
    crew_ids = {f.follower_id for f in db.query(Follow).filter(Follow.followee_id == current_user.id).all()}
    circle_ids = {f.followee_id for f in db.query(Follow).filter(Follow.follower_id == current_user.id).all()}
    candidate_ids = (crew_ids | circle_ids) - {current_user.id}

    if not candidate_ids:
        return []

    query = db.query(User).filter(User.id.in_(candidate_ids))
    trimmed = q.strip().lstrip("@")
    if trimmed:
        like = f"%{trimmed.lower()}%"
        query = query.filter(
            (User.username.ilike(like)) | (User.display_name.ilike(like))
        )

    matches = query.order_by(User.username.asc()).limit(20).all()
    return [serialize_user(db, u, current_user) for u in matches]


@router.get("/{user_id}", response_model=UserPublic)
def get_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = _get_user_or_404(db, user_id)
    return serialize_user(db, user, current_user)


@router.put("/{user_id}", response_model=UserPublic)
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own Space")

    if payload.username is not None:
        new_tag = normalize_flicktag(payload.username)
        if not new_tag or len(new_tag) < 3:
            raise HTTPException(status_code=400, detail="FlickTag must be at least 3 characters")
        if new_tag != current_user.username:
            conflict = db.query(User).filter(User.username == new_tag).first()
            if conflict and conflict.id != current_user.id:
                raise HTTPException(status_code=409, detail=f"@{new_tag} is already taken — try another FlickTag")
            current_user.username = new_tag

    if payload.display_name is not None:
        current_user.display_name = payload.display_name
    if payload.bio is not None:
        current_user.bio = payload.bio
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url
    if payload.website is not None:
        current_user.website = payload.website
    if payload.pronouns is not None:
        current_user.pronouns = payload.pronouns
    if payload.contact_info is not None:
        current_user.contact_info = payload.contact_info
    if payload.show_contact is not None:
        current_user.show_contact = payload.show_contact

    db.commit()
    db.refresh(current_user)
    return serialize_user(db, current_user, current_user)


@router.put("/{user_id}/verify", response_model=UserPublic, status_code=200)
def set_verification(
    user_id: str,
    verified: bool,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Grant or revoke Verified Space. Admin-only — enforced server-side via get_current_admin,
    never by hiding the button on the frontend."""
    target = _get_user_or_404(db, user_id)
    target.is_verified = verified
    db.commit()
    db.refresh(target)
    return serialize_user(db, target, admin)


@router.get("/{user_id}/posts", response_model=list[PostOut])
def get_user_posts(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """A specific user's Flicks for their Space grid — pinned posts first (most-recently-pinned
    first), then the rest by recency. Archived posts are included only when the viewer is the
    owner (so Unarchive stays reachable); everyone else never sees them."""
    target = _get_user_or_404(db, user_id)
    if target.id in get_hidden_private_author_ids(db, current_user.id):
        raise HTTPException(status_code=403, detail="This Space is private")

    query = db.query(Post).filter(Post.author_id == user_id)
    if current_user.id != user_id:
        query = query.filter(Post.is_archived == False)  # noqa: E712

    posts = query.order_by(Post.is_pinned.desc(), Post.pinned_at.desc(), Post.created_at.desc()).all()
    return [serialize_post(db, p, current_user) for p in posts]


@router.get("/{user_id}/followers", response_model=list[UserPublic])
def get_followers(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_user_or_404(db, user_id)
    rows = db.query(Follow).filter(Follow.followee_id == user_id).all()
    followers = [db.query(User).get(r.follower_id) for r in rows]
    return [serialize_user(db, u, current_user) for u in followers if u]


@router.get("/{user_id}/following", response_model=list[UserPublic])
def get_following(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_user_or_404(db, user_id)
    rows = db.query(Follow).filter(Follow.follower_id == user_id).all()
    following = [db.query(User).get(r.followee_id) for r in rows]
    return [serialize_user(db, u, current_user) for u in following if u]


@router.post("/{user_id}/follow", status_code=204)
def follow_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target = _get_user_or_404(db, user_id)
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't follow yourself")

    existing = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.followee_id == target.id)
        .first()
    )
    if not existing:
        db.add(Follow(follower_id=current_user.id, followee_id=target.id))
        notify(db, recipient_id=target.id, actor_id=current_user.id, ntype=NotificationType.follow)
        db.commit()
    return


@router.delete("/{user_id}/follow", status_code=204)
def unfollow_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.followee_id == user_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
    return