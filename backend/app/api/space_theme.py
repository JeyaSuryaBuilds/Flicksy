from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, SpaceTheme, SpaceThemePreset
from app.schemas.extended_schemas import SpaceThemeOut, SpaceThemeUpdate
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/space-theme", tags=["space-theme"])

# Preset definitions live server-side so "preset: sunset" always means the same thing
# everywhere it's read, and so new presets can be added without a frontend redeploy.
PRESETS = {
    SpaceThemePreset.midnight: dict(
        background_color="#15130F", background_gradient="", accent_color="#FF6B4A",
        card_style="rounded", button_style="filled", font_style="default", avatar_frame="ring", glow_effect=False,
    ),
    SpaceThemePreset.sunset: dict(
        background_color="#1F140F", background_gradient="linear-gradient(160deg,#2A160F,#150E0B)",
        accent_color="#FF6B4A", card_style="rounded", button_style="filled", font_style="default",
        avatar_frame="glow", glow_effect=True,
    ),
    SpaceThemePreset.aurora: dict(
        background_color="#0F1615", background_gradient="linear-gradient(160deg,#0F1F1C,#0B1210)",
        accent_color="#4AFFC3", card_style="rounded", button_style="soft", font_style="default",
        avatar_frame="glow", glow_effect=True,
    ),
    SpaceThemePreset.minimal: dict(
        background_color="#15130F", background_gradient="", accent_color="#F5EFE4",
        card_style="outlined", button_style="outline", font_style="mono", avatar_frame="none", glow_effect=False,
    ),
}


def _get_or_create_theme(db: Session, user: User) -> SpaceTheme:
    theme = db.query(SpaceTheme).filter(SpaceTheme.user_id == user.id).first()
    if not theme:
        defaults = PRESETS[SpaceThemePreset.midnight]
        theme = SpaceTheme(user_id=user.id, preset=SpaceThemePreset.midnight, **defaults)
        db.add(theme)
        db.commit()
        db.refresh(theme)
    return theme


@router.get("/me", response_model=SpaceThemeOut)
def get_my_theme(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_or_create_theme(db, current_user)


@router.get("/user/{user_id}", response_model=SpaceThemeOut)
def get_user_theme(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Applied whenever anyone visits that user's Space — real backend data, not a local setting."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Space not found")
    return _get_or_create_theme(db, target)


@router.put("/me", response_model=SpaceThemeOut)
def update_my_theme(
    payload: SpaceThemeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    theme = _get_or_create_theme(db, current_user)
    updates = payload.model_dump(exclude_unset=True)

    # Choosing a non-custom preset resets to that preset's canonical values, then any
    # explicitly-passed fields in the same request override on top (used for live custom edits).
    if "preset" in updates and updates["preset"] != "custom":
        preset_key = SpaceThemePreset(updates["preset"])
        for k, v in PRESETS[preset_key].items():
            setattr(theme, k, v)
        theme.preset = preset_key
        updates.pop("preset")

    for key, value in updates.items():
        if key == "preset":
            theme.preset = SpaceThemePreset(value)
        else:
            setattr(theme, key, value)

    # Any manual field edit beyond a straight preset selection is a Custom theme going forward.
    if updates:
        theme.preset = SpaceThemePreset.custom

    db.commit()
    db.refresh(theme)
    return theme
