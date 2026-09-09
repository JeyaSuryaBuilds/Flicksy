from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, Report, ReportTargetType
from app.schemas.extended_schemas import ReportCreate, ReportOut
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

VALID_TARGET_TYPES = {t.value for t in ReportTargetType}


@router.post("", response_model=ReportOut, status_code=201)
def create_report(payload: ReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.target_type not in VALID_TARGET_TYPES:
        raise HTTPException(status_code=400, detail=f"target_type must be one of {sorted(VALID_TARGET_TYPES)}")

    report = Report(
        reporter_id=current_user.id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        reason=payload.reason,
        details=payload.details,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return ReportOut(
        id=report.id,
        target_type=report.target_type.value,
        target_id=report.target_id,
        reason=report.reason,
        details=report.details,
        status=report.status.value,
        created_at=report.created_at,
    )


@router.get("/mine", response_model=list[ReportOut])
def my_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reports = db.query(Report).filter(Report.reporter_id == current_user.id).order_by(Report.created_at.desc()).all()
    return [
        ReportOut(
            id=r.id, target_type=r.target_type.value, target_id=r.target_id,
            reason=r.reason, details=r.details, status=r.status.value, created_at=r.created_at,
        )
        for r in reports
    ]
