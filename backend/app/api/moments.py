from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User, Story, StoryView, Follow, MomentEcho, MomentSendOn, ConversationMember
from app.schemas.extended_schemas import MomentCreate, MomentOut, MomentAuthorGroup, MomentEchoCreate, MomentEchoOut, MomentSendOnCreate, MomentRecastCreate
from app.auth.dependencies import get_current_user
from app.utils.serializers import user_initials

router = APIRouter(prefix="/moments", tags=["moments"])

def _serialize_moment(db: Session, story: Story, viewer: User) -> MomentOut:
    viewed = db.query(StoryView).filter(StoryView.story_id == story.id, StoryView.viewer_id == viewer.id).first() is not None
    view_count = db.query(StoryView).filter(StoryView.story_id == story.id).count()
    echo_count = db.query(MomentEcho).filter(MomentEcho.story_id == story.id).count()
    return MomentOut(
        id=story.id,
        author_id=story.author_id,
        media_url=story.media_url or "",
        media_type=story.media_type or "image",
        text_content=story.text_content,
        sound_id=story.sound_id,
        overlay_data=story.overlay_data,
        allow_echo=story.allow_echo,
        allow_send_on=story.allow_send_on,
        allow_recast=story.allow_recast,
        recast_of_id=story.recast_of_id,
        created_at=story.created_at,
        expires_at=story.expires_at,
        viewed=viewed,
        view_count=view_count,
        echo_count=echo_count,
    )

def _get_moment_or_404(db: Session, moment_id: str) -> Story:
    story = db.query(Story).filter(Story.id == moment_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Moment not found")
    return story

def _assert_can_view(db: Session, story: Story, viewer: User):
    """Private (Close Crew) Moments must not be viewable or shareable by non-Circle users."""
    if story.author_id == viewer.id:
        return
    if story.close_crew_only:
        is_circle = db.query(Follow).filter(Follow.follower_id == viewer.id, Follow.followee_id == story.author_id).first() is not None
        if not is_circle:
            raise HTTPException(status_code=403, detail="This Moment is only visible to Close Crew")

@router.get("", response_model=list[MomentAuthorGroup])
def get_moments_row(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Active (non-expired) Moments from people the current user follows."""
    now = datetime.utcnow()
    circle_ids = [f.followee_id for f in db.query(Follow).filter(Follow.follower_id == current_user.id).all()]
    stories = db.query(Story).filter(Story.author_id.in_(circle_ids), (Story.expires_at.is_(None)) | (Story.expires_at > now)).order_by(Story.created_at.desc()).all()
    grouped: dict[str, list[Story]] = {}
    for s in stories:
        grouped.setdefault(s.author_id, []).append(s)
    results = []
    for author_id, author_stories in grouped.items():
        author = db.query(User).filter(User.id == author_id).first()
        if not author:
            continue
        serialized = [_serialize_moment(db, s, current_user) for s in author_stories]
        results.append(
            MomentAuthorGroup(
                author_id=author.id,
                author_username=author.username,
                author_avatar_url=author.avatar_url or "",
                author_avatar_initials=author.avatar_initials or user_initials(author.display_name),
                moments=serialized,
                all_viewed=all(m.viewed for m in serialized),
            )
        )
    return results

@router.get("/mine", response_model=list[MomentOut])
def get_my_moments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    stories = db.query(Story).filter(Story.author_id == current_user.id, (Story.expires_at.is_(None)) | (Story.expires_at > now)).order_by(Story.created_at.desc()).all()
    return [_serialize_moment(db, s, current_user) for s in stories]

@router.post("", response_model=MomentOut, status_code=201)
def create_moment(payload: MomentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    story = Story(
        author_id=current_user.id,
        media_url=payload.media_url,
        media_type=payload.media_type,
        text_content=payload.text_content,
        sound_id=payload.sound_id,
        overlay_data=payload.overlay_data,
        close_crew_only=payload.close_crew_only,
        allow_echo=payload.allow_echo,
        allow_send_on=payload.allow_send_on,
        allow_recast=payload.allow_recast,
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return _serialize_moment(db, story, current_user)

@router.post("/{moment_id}/view", status_code=204)
def view_moment(moment_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    story = _get_moment_or_404(db, moment_id)
    _assert_can_view(db, story, current_user)
    existing = db.query(StoryView).filter(StoryView.story_id == moment_id, StoryView.viewer_id == current_user.id).first()
    if existing:
        return
    try:
        db.add(StoryView(story_id=moment_id, viewer_id=current_user.id))
        db.commit()
    except IntegrityError:
        db.rollback()
    return

@router.get("/{moment_id}/echoes", response_model=list[MomentEchoOut])
def list_echoes(moment_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    story = _get_moment_or_404(db, moment_id)
    _assert_can_view(db, story, current_user)
    return db.query(MomentEcho).filter(MomentEcho.story_id == moment_id).order_by(MomentEcho.created_at.asc()).all()

@router.post("/{moment_id}/echoes", response_model=MomentEchoOut, status_code=201)
def add_echo(moment_id: str, payload: MomentEchoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    story = _get_moment_or_404(db, moment_id)
    _assert_can_view(db, story, current_user)
    if not story.allow_echo:
        raise HTTPException(status_code=403, detail="The creator has turned off Echoes for this Moment")
    echo = MomentEcho(story_id=moment_id, author_id=current_user.id, body=payload.body)
    db.add(echo)
    db.commit()
    db.refresh(echo)
    return echo

@router.post("/{moment_id}/send-on", status_code=204)
def send_on_moment(moment_id: str, payload: MomentSendOnCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    story = _get_moment_or_404(db, moment_id)
    _assert_can_view(db, story, current_user)
    if not story.allow_send_on:
        raise HTTPException(status_code=403, detail="The creator has turned off Send On for this Moment")
    membership = db.query(ConversationMember).filter(ConversationMember.conversation_id == payload.conversation_id, ConversationMember.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You're not a member of that Chat")
    db.add(MomentSendOn(story_id=moment_id, sender_id=current_user.id, conversation_id=payload.conversation_id))
    db.commit()
    return

@router.post("/{moment_id}/recast", response_model=MomentOut, status_code=201)
def recast_moment(moment_id: str, payload: MomentRecastCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    original = _get_moment_or_404(db, moment_id)
    if original.close_crew_only:
        raise HTTPException(status_code=403, detail="Private Moments can't be Recast")
    if not original.allow_recast:
        raise HTTPException(status_code=403, detail="The creator has turned off Recast for this Moment")
    recast = Story(
        author_id=current_user.id,
        media_url=original.media_url,
        media_type=original.media_type,
        text_content=payload.caption or original.text_content,
        sound_id=original.sound_id,
        overlay_data=original.overlay_data,
        recast_of_id=original.id,
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(recast)
    db.commit()
    db.refresh(recast)
    return _serialize_moment(db, recast, current_user)

@router.put("/{moment_id}/permissions", response_model=MomentOut)
def update_moment_permissions(moment_id: str, allow_echo: bool = None, allow_send_on: bool = None, allow_recast: bool = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Creator interaction controls — only the Moment's author can change these permissions."""
    story = _get_moment_or_404(db, moment_id)
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only manage your own Moment's permissions")
    if allow_echo is not None:
        story.allow_echo = allow_echo
    if allow_send_on is not None:
        story.allow_send_on = allow_send_on
    if allow_recast is not None:
        story.allow_recast = allow_recast
    db.commit()
    db.refresh(story)
    return _serialize_moment(db, story, current_user)

@router.delete("/{moment_id}", status_code=204)
def delete_moment(moment_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    story = _get_moment_or_404(db, moment_id)
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own Moments")
    db.delete(story)
    db.commit()
    return