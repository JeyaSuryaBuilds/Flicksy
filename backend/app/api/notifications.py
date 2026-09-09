from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, Notification
from app.schemas.schemas import NotificationOut
from app.auth.dependencies import get_current_user
from app.utils.serializers import serialize_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = (
        db.query(Notification)
        .filter(Notification.recipient_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    out = []
    for n in rows:
        actor = db.query(User).get(n.actor_id)
        if not actor:
            continue
        out.append(
            NotificationOut(
                id=n.id,
                type=n.type.value if hasattr(n.type, "value") else n.type,
                actor=serialize_user(db, actor, current_user),
                post_id=n.post_id,
                is_read=n.is_read,
                created_at=n.created_at,
            )
        )
    return out


@router.put("/{notification_id}/read", status_code=204)
def mark_read(notification_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your notification")

    notif.is_read = True
    db.commit()
    return
