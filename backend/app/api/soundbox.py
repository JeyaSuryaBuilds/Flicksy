from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, Sound, Post
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/soundbox", tags=["soundbox"])


class SoundOut(BaseModel):
    id: str
    title: str
    artist: str
    cover_url: str
    audio_url: str
    duration_seconds: int
    source: str

    class Config:
        from_attributes = True


class OriginalSoundCreate(BaseModel):
    title: str
    audio_url: str
    duration_seconds: int = 0


@router.get("/search", response_model=list[SoundOut])
def search_sounds(q: str = Query(min_length=1), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    like = f"%{q}%"
    rows = db.query(Sound).filter((Sound.title.ilike(like)) | (Sound.artist.ilike(like))).limit(30).all()
    return rows


@router.get("/trending", response_model=list[SoundOut])
def trending_sounds(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Placeholder ranking (most recently added) until real usage-count ranking and/or a
    licensed catalog provider is connected — see Sound.source/external_id for that hook."""
    return db.query(Sound).order_by(Sound.created_at.desc()).limit(20).all()


@router.get("/recent", response_model=list[SoundOut])
def recently_used_sounds(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    recent_sound_ids = (
        db.query(Post.sound_id)
        .filter(Post.author_id == current_user.id, Post.sound_id.isnot(None))
        .order_by(Post.created_at.desc())
        .limit(10)
        .all()
    )
    ids = [r[0] for r in recent_sound_ids]
    if not ids:
        return []
    return db.query(Sound).filter(Sound.id.in_(ids)).all()


@router.post("/original", response_model=SoundOut, status_code=201)
def upload_original_sound(
    payload: OriginalSoundCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Original Sound: a user's own uploaded audio (use POST /media/upload with kind=video/audio
    first to get audio_url, then register it here as a reusable Sound)."""
    sound = Sound(
        title=payload.title,
        artist=current_user.username,
        audio_url=payload.audio_url,
        duration_seconds=payload.duration_seconds,
        source="original",
        uploaded_by_id=current_user.id,
    )
    db.add(sound)
    db.commit()
    db.refresh(sound)
    return sound


@router.get("/{sound_id}", response_model=SoundOut)
def get_sound(sound_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sound = db.query(Sound).filter(Sound.id == sound_id).first()
    if not sound:
        raise HTTPException(status_code=404, detail="Sound not found")
    return sound


@router.get("/{sound_id}/uses", response_model=list)
def get_sound_uses(sound_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Rushes using a sound."""
    from app.utils.serializers import serialize_post
    posts = db.query(Post).filter(Post.sound_id == sound_id, Post.is_rush == True).all()  # noqa: E712
    return [serialize_post(db, p, current_user) for p in posts]
