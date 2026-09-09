from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, UserSettings
from app.schemas.extended_schemas import UserSettingsOut, UserSettingsUpdate
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])


def _get_or_create_settings(db: Session, user: User) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=UserSettingsOut)
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_or_create_settings(db, current_user)


@router.put("", response_model=UserSettingsOut)
def update_settings(
    payload: UserSettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    settings = _get_or_create_settings(db, current_user)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings
