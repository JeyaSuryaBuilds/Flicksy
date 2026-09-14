from typing import Optional
from sqlalchemy.orm import Session

from app.models.models import User, Post, Follow, Like, Bookmark, Comment, UserSettings
from app.schemas.schemas import UserPublic, PostOut, PostMediaOut


def user_initials(display_name: str) -> str:
    parts = [p for p in display_name.strip().split(" ") if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[1][0]).upper()


def serialize_user(db: Session, user: User, viewer: Optional[User] = None) -> UserPublic:
    followers_count = db.query(Follow).filter(Follow.followee_id == user.id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == user.id).count()
    posts_count = db.query(Post).filter(Post.author_id == user.id, Post.is_archived == False).count()  # noqa: E712

    is_following = False
    is_followed_by = False
    if viewer is not None and viewer.id != user.id:
        is_following = (
            db.query(Follow)
            .filter(Follow.follower_id == viewer.id, Follow.followee_id == user.id)
            .first()
            is not None
        )
        is_followed_by = (
            db.query(Follow)
            .filter(Follow.follower_id == user.id, Follow.followee_id == viewer.id)
            .first()
            is not None
        )

    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    is_private = bool(settings.is_private) if settings else False

    # Private Space content is only visible to the owner and their Crew (approved-follower
    # model isn't built yet, so "is_following" stands in for "has access" for now — see README).
    can_view_content = True
    if viewer is not None and viewer.id != user.id and is_private:
        can_view_content = is_following

    is_owner = viewer is not None and viewer.id == user.id
    show_contact = bool(user.show_contact)
    # Contact info is only ever included for the owner themselves or when they've
    # explicitly turned Show Contact on — never leaked to other viewers otherwise.
    contact_info = (user.contact_info or "") if (is_owner or show_contact) else ""

    return UserPublic(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        bio=user.bio or "",
        avatar_url=user.avatar_url or "",
        avatar_initials=user.avatar_initials or user_initials(user.display_name),
        website=user.website or "",
        pronouns=user.pronouns or "",
        is_verified=user.is_verified,
        is_admin=user.is_admin,
        is_private=is_private,
        is_email_verified=user.is_email_verified,
        followers_count=followers_count,
        following_count=following_count,
        posts_count=posts_count,
        is_following=is_following,
        is_followed_by=is_followed_by,
        can_view_content=can_view_content,
        show_contact=show_contact,
        contact_info=contact_info,
    )


def serialize_post(db: Session, post: Post, viewer: Optional[User] = None) -> PostOut:
    like_count = db.query(Like).filter(Like.post_id == post.id).count()
    comment_count = db.query(Comment).filter(Comment.post_id == post.id).count()

    is_liked = False
    is_bookmarked = False
    if viewer is not None:
        is_liked = (
            db.query(Like).filter(Like.post_id == post.id, Like.user_id == viewer.id).first()
            is not None
        )
        is_bookmarked = (
            db.query(Bookmark)
            .filter(Bookmark.post_id == post.id, Bookmark.user_id == viewer.id)
            .first()
            is not None
        )

    return PostOut(
        id=post.id,
        author=serialize_user(db, post.author, viewer),
        caption=post.caption or "",
        location=post.location or "",
        media_type=post.media_type,
        media_tag=post.media_tag or "",
        media=[PostMediaOut.model_validate(m) for m in post.media],
        is_rush=post.is_rush,
        is_archived=post.is_archived,
        is_pinned=post.is_pinned,
        sound_id=post.sound_id,
        like_count=like_count,
        comment_count=comment_count,
        is_liked=is_liked,
        is_bookmarked=is_bookmarked,
        created_at=post.created_at,
    )


def get_hidden_private_author_ids(db: Session, viewer_id: str) -> list:
    """Author IDs whose Space is private and the viewer doesn't have access to (not the owner,
    not their Crew). Used to filter private content out of feeds/search server-side."""
    private_user_ids = [
        u.id for u in db.query(User.id).join(UserSettings).filter(UserSettings.is_private == True).all()  # noqa: E712
    ]
    if not private_user_ids:
        return []
    followed_ids = {f.followee_id for f in db.query(Follow).filter(Follow.follower_id == viewer_id).all()}
    return [uid for uid in private_user_ids if uid != viewer_id and uid not in followed_ids]