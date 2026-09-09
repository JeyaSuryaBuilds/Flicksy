from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import (
    User, Post, Story, Report, ReportStatus, Ad, AdStatus, Comment,
)
from app.auth.dependencies import get_current_admin
from app.schemas.schemas import UserPublic
from app.schemas.extended_schemas import ReportOut
from app.utils.serializers import serialize_user

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------- Dashboard ----------
@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return {
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter(User.is_active == True).count(),  # noqa: E712
        "verified_spaces": db.query(User).filter(User.is_verified == True).count(),  # noqa: E712
        "flicks": db.query(Post).filter(Post.is_rush == False).count(),  # noqa: E712
        "rushes": db.query(Post).filter(Post.is_rush == True).count(),  # noqa: E712
        "moments": db.query(Story).count(),
        "pending_reports": db.query(Report).filter(Report.status == ReportStatus.pending).count(),
        "total_reports": db.query(Report).count(),
        "active_ads": db.query(Ad).filter(Ad.status == AdStatus.active).count(),
    }


# ---------- User management ----------
@router.get("/users", response_model=list[UserPublic])
def search_users(
    q: Optional[str] = None, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
):
    query = db.query(User)
    if q:
        like = f"%{q}%"
        query = query.filter((User.username.ilike(like)) | (User.email.ilike(like)) | (User.display_name.ilike(like)))
    users = query.order_by(User.created_at.desc()).limit(50).all()
    return [serialize_user(db, u, admin) for u in users]


@router.put("/users/{user_id}/suspend", status_code=204)
def suspend_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return


@router.put("/users/{user_id}/restore", status_code=204)
def restore_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    return


@router.put("/users/{user_id}/role", status_code=204)
def set_role(user_id: str, is_admin: bool, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = is_admin
    db.commit()
    return


# ---------- Content management ----------
@router.delete("/posts/{post_id}", status_code=204)
def remove_flick(post_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Flick not found")
    db.delete(post)
    db.commit()
    return


@router.delete("/moments/{moment_id}", status_code=204)
def remove_moment(moment_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    story = db.query(Story).filter(Story.id == moment_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Moment not found")
    db.delete(story)
    db.commit()
    return


@router.delete("/comments/{comment_id}", status_code=204)
def remove_comment(comment_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Echo not found")
    db.delete(comment)
    db.commit()
    return


# ---------- Reports queue / moderation ----------
class ReportActionRequest(BaseModel):
    action: str  # "dismiss" | "actioned" | "reviewed"


def _serialize_report(r: Report) -> ReportOut:
    return ReportOut(
        id=r.id, target_type=r.target_type.value, target_id=r.target_id,
        reason=r.reason, details=r.details, status=r.status.value, created_at=r.created_at,
    )


@router.get("/reports", response_model=list[ReportOut])
def list_reports(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(Report)
    if status_filter:
        query = query.filter(Report.status == ReportStatus(status_filter))
    reports = query.order_by(Report.created_at.desc()).limit(100).all()
    return [_serialize_report(r) for r in reports]


@router.put("/reports/{report_id}", response_model=ReportOut)
def action_report(
    report_id: str, payload: ReportActionRequest, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    try:
        report.status = ReportStatus(payload.action)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid action: {payload.action}")
    db.commit()
    db.refresh(report)
    return _serialize_report(report)


# ---------- Ads management ----------
class AdCreate(BaseModel):
    title: str
    advertiser: str
    description: str = ""
    media_url: str = ""
    cta_text: str = "Learn More"
    destination_url: str = ""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    targeting: str = ""
    budget_cents: int = 0


class AdUpdate(BaseModel):
    title: Optional[str] = None
    advertiser: Optional[str] = None
    description: Optional[str] = None
    media_url: Optional[str] = None
    cta_text: Optional[str] = None
    destination_url: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    targeting: Optional[str] = None
    budget_cents: Optional[int] = None


class AdOut(BaseModel):
    id: str
    title: str
    advertiser: str
    description: str
    media_url: str
    cta_text: str
    destination_url: str
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    targeting: str
    budget_cents: int
    impressions: int
    clicks: int
    spend_cents: int
    ctr: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


def _serialize_ad(ad: Ad) -> AdOut:
    ctr = (ad.clicks / ad.impressions * 100) if ad.impressions else 0.0
    return AdOut(
        id=ad.id, title=ad.title, advertiser=ad.advertiser, description=ad.description,
        media_url=ad.media_url, cta_text=ad.cta_text, destination_url=ad.destination_url,
        status=ad.status.value, start_date=ad.start_date, end_date=ad.end_date,
        targeting=ad.targeting, budget_cents=ad.budget_cents, impressions=ad.impressions,
        clicks=ad.clicks, spend_cents=ad.spend_cents, ctr=round(ctr, 2), created_at=ad.created_at,
    )


@router.get("/ads", response_model=list[AdOut])
def list_ads(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    ads = db.query(Ad).order_by(Ad.created_at.desc()).all()
    return [_serialize_ad(a) for a in ads]


@router.post("/ads", response_model=AdOut, status_code=201)
def create_ad(payload: AdCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    ad = Ad(**payload.model_dump(), created_by_id=admin.id, status=AdStatus.draft)
    db.add(ad)
    db.commit()
    db.refresh(ad)
    return _serialize_ad(ad)


@router.put("/ads/{ad_id}", response_model=AdOut)
def update_ad(ad_id: str, payload: AdUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    ad = db.query(Ad).filter(Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates:
        updates["status"] = AdStatus(updates["status"])
    for key, value in updates.items():
        setattr(ad, key, value)
    db.commit()
    db.refresh(ad)
    return _serialize_ad(ad)


@router.put("/ads/{ad_id}/pause", response_model=AdOut)
def pause_ad(ad_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    ad = db.query(Ad).filter(Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    ad.status = AdStatus.paused
    db.commit()
    db.refresh(ad)
    return _serialize_ad(ad)


@router.put("/ads/{ad_id}/resume", response_model=AdOut)
def resume_ad(ad_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    ad = db.query(Ad).filter(Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    ad.status = AdStatus.active
    db.commit()
    db.refresh(ad)
    return _serialize_ad(ad)


@router.delete("/ads/{ad_id}", status_code=204)
def delete_ad(ad_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    ad = db.query(Ad).filter(Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    db.delete(ad)
    db.commit()
    return
