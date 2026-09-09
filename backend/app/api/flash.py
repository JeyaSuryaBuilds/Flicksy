from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, FlashMessage
from app.auth.dependencies import get_current_user
from app.utils.serializers import serialize_user

router = APIRouter(prefix="/flash", tags=["flash"])


class FlashCreate(BaseModel):
    recipient_id: str
    media_url: str
    media_type: str = "image"  # image | video
    caption: str = ""
    reply_to_flash_id: Optional[str] = None
    is_disappearing: bool = True


class FlashOut(BaseModel):
    id: str
    sender_id: str
    recipient_id: str
    media_url: str
    media_type: str
    caption: str
    reply_to_flash_id: Optional[str] = None
    is_disappearing: bool
    delivered_at: datetime
    seen_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=FlashOut, status_code=201)
def send_flash(payload: FlashCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    recipient = db.query(User).filter(User.id == payload.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=400, detail="Invalid Flash recipient")
    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't Flash yourself")

    flash = FlashMessage(
        sender_id=current_user.id,
        recipient_id=recipient.id,
        media_url=payload.media_url,
        media_type=payload.media_type,
        caption=payload.caption,
        reply_to_flash_id=payload.reply_to_flash_id,
        is_disappearing=payload.is_disappearing,
    )
    db.add(flash)
    db.commit()
    db.refresh(flash)
    return flash


@router.get("/inbox", response_model=list[FlashOut])
def get_inbox(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = (
        db.query(FlashMessage)
        .filter(FlashMessage.recipient_id == current_user.id, FlashMessage.deleted_at.is_(None))
        .order_by(FlashMessage.created_at.desc())
        .all()
    )
    return rows


@router.get("/sent", response_model=list[FlashOut])
def get_sent(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = (
        db.query(FlashMessage)
        .filter(FlashMessage.sender_id == current_user.id, FlashMessage.deleted_at.is_(None))
        .order_by(FlashMessage.created_at.desc())
        .all()
    )
    return rows


@router.post("/{flash_id}/seen", status_code=204)
def mark_seen(flash_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    flash = db.query(FlashMessage).filter(FlashMessage.id == flash_id).first()
    if not flash:
        raise HTTPException(status_code=404, detail="Flash not found")
    if flash.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your Flash to view")
    if not flash.seen_at:
        flash.seen_at = datetime.utcnow()
        db.commit()
    return


@router.delete("/{flash_id}", status_code=204)
def unsend_flash(flash_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    flash = db.query(FlashMessage).filter(FlashMessage.id == flash_id).first()
    if not flash:
        raise HTTPException(status_code=404, detail="Flash not found")
    if flash.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only unsend your own Flash")
    flash.deleted_at = datetime.utcnow()
    db.commit()
    return
