from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import (
    User, FounderProfile, FounderProject, FounderSkill, FounderLink, FounderAchievement,
)
from app.schemas.founder_schemas import (
    FounderProfileOut, FounderProfileUpdate,
    FounderProjectOut, FounderProjectCreate, FounderProjectUpdate,
    FounderSkillOut, FounderSkillCreate, FounderSkillUpdate,
    FounderLinkOut, FounderLinkCreate, FounderLinkUpdate,
    FounderAchievementOut, FounderAchievementCreate, FounderAchievementUpdate,
    FounderKnowledgeOut,
)
from app.auth.dependencies import get_current_user, get_current_admin
from app.services.founder_service import get_or_create_founder_profile

router = APIRouter(tags=["founder"])


# ===========================================================================
# Public read endpoints — any authenticated user (this app has no
# unauthenticated views anywhere else either). Only is_public=True rows are
# ever returned here; this is also exactly what Flickzy AI's context builder
# reads from (see app/services/founder_service.py).
# ===========================================================================

@router.get("/founder/profile", response_model=FounderProfileOut)
def get_public_founder_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = get_or_create_founder_profile(db)
    if not profile.is_public:
        raise HTTPException(status_code=404, detail="Founder profile is not public")
    return profile


@router.get("/founder/projects", response_model=list[FounderProjectOut])
def get_public_founder_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = get_or_create_founder_profile(db)
    return (
        db.query(FounderProject)
        .filter(FounderProject.founder_id == profile.id, FounderProject.is_public == True)  # noqa: E712
        .order_by(FounderProject.display_order.asc(), FounderProject.created_at.desc())
        .all()
    )


@router.get("/founder/skills", response_model=list[FounderSkillOut])
def get_public_founder_skills(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = get_or_create_founder_profile(db)
    return (
        db.query(FounderSkill)
        .filter(FounderSkill.founder_id == profile.id, FounderSkill.is_public == True)  # noqa: E712
        .order_by(FounderSkill.display_order.asc())
        .all()
    )


@router.get("/founder/links", response_model=list[FounderLinkOut])
def get_public_founder_links(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = get_or_create_founder_profile(db)
    return (
        db.query(FounderLink)
        .filter(FounderLink.founder_id == profile.id, FounderLink.is_public == True)  # noqa: E712
        .order_by(FounderLink.display_order.asc())
        .all()
    )


@router.get("/founder/achievements", response_model=list[FounderAchievementOut])
def get_public_founder_achievements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = get_or_create_founder_profile(db)
    return (
        db.query(FounderAchievement)
        .filter(FounderAchievement.founder_id == profile.id, FounderAchievement.is_public == True)  # noqa: E712
        .order_by(FounderAchievement.display_order.asc())
        .all()
    )


@router.get("/founder/knowledge", response_model=FounderKnowledgeOut)
def get_public_founder_knowledge(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Everything public about the founder in one call. Flickzy AI does NOT use this
    endpoint directly (it calls the founder_service context builder in-process, which
    is more selective) — this exists for completeness / potential future frontend use."""
    profile = get_or_create_founder_profile(db)
    if not profile.is_public:
        return FounderKnowledgeOut()

    return FounderKnowledgeOut(
        profile=profile,
        projects=(
            db.query(FounderProject)
            .filter(FounderProject.founder_id == profile.id, FounderProject.is_public == True)  # noqa: E712
            .order_by(FounderProject.display_order.asc())
            .all()
        ),
        skills=(
            db.query(FounderSkill)
            .filter(FounderSkill.founder_id == profile.id, FounderSkill.is_public == True)  # noqa: E712
            .order_by(FounderSkill.display_order.asc())
            .all()
        ),
        links=(
            db.query(FounderLink)
            .filter(FounderLink.founder_id == profile.id, FounderLink.is_public == True)  # noqa: E712
            .order_by(FounderLink.display_order.asc())
            .all()
        ),
        achievements=(
            db.query(FounderAchievement)
            .filter(FounderAchievement.founder_id == profile.id, FounderAchievement.is_public == True)  # noqa: E712
            .order_by(FounderAchievement.display_order.asc())
            .all()
        ),
    )


# ===========================================================================
# Admin management — mirrors the existing Ads admin CRUD pattern (see
# app/api/admin.py). Sees and edits everything, public or not.
# ===========================================================================

@router.get("/admin/founder/profile", response_model=FounderProfileOut)
def admin_get_founder_profile(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return get_or_create_founder_profile(db)


@router.put("/admin/founder/profile", response_model=FounderProfileOut)
def admin_update_founder_profile(
    payload: FounderProfileUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
):
    profile = get_or_create_founder_profile(db)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile


# ---------- Projects ----------
@router.get("/admin/founder/projects", response_model=list[FounderProjectOut])
def admin_list_founder_projects(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    profile = get_or_create_founder_profile(db)
    return (
        db.query(FounderProject)
        .filter(FounderProject.founder_id == profile.id)
        .order_by(FounderProject.display_order.asc(), FounderProject.created_at.desc())
        .all()
    )


@router.post("/admin/founder/projects", response_model=FounderProjectOut, status_code=201)
def admin_create_founder_project(
    payload: FounderProjectCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
):
    profile = get_or_create_founder_profile(db)
    project = FounderProject(founder_id=profile.id, **payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.put("/admin/founder/projects/{project_id}", response_model=FounderProjectOut)
def admin_update_founder_project(
    project_id: str, payload: FounderProjectUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
):
    project = db.query(FounderProject).filter(FounderProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/admin/founder/projects/{project_id}", status_code=204)
def admin_delete_founder_project(project_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    project = db.query(FounderProject).filter(FounderProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return


# ---------- Skills ----------
@router.get("/admin/founder/skills", response_model=list[FounderSkillOut])
def admin_list_founder_skills(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    profile = get_or_create_founder_profile(db)
    return (
        db.query(FounderSkill)
        .filter(FounderSkill.founder_id == profile.id)
        .order_by(FounderSkill.display_order.asc())
        .all()
    )


@router.post("/admin/founder/skills", response_model=FounderSkillOut, status_code=201)
def admin_create_founder_skill(
    payload: FounderSkillCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
):
    profile = get_or_create_founder_profile(db)
    skill = FounderSkill(founder_id=profile.id, **payload.model_dump())
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


@router.put("/admin/founder/skills/{skill_id}", response_model=FounderSkillOut)
def admin_update_founder_skill(
    skill_id: str, payload: FounderSkillUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
):
    skill = db.query(FounderSkill).filter(FounderSkill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(skill, key, value)
    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/admin/founder/skills/{skill_id}", status_code=204)
def admin_delete_founder_skill(skill_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    skill = db.query(FounderSkill).filter(FounderSkill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    db.delete(skill)
    db.commit()
    return


# ---------- Links ----------
@router.get("/admin/founder/links", response_model=list[FounderLinkOut])
def admin_list_founder_links(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    profile = get_or_create_founder_profile(db)
    return (
        db.query(FounderLink)
        .filter(FounderLink.founder_id == profile.id)
        .order_by(FounderLink.display_order.asc())
        .all()
    )


@router.post("/admin/founder/links", response_model=FounderLinkOut, status_code=201)
def admin_create_founder_link(
    payload: FounderLinkCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
):
    profile = get_or_create_founder_profile(db)
    link = FounderLink(founder_id=profile.id, **payload.model_dump())
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.put("/admin/founder/links/{link_id}", response_model=FounderLinkOut)
def admin_update_founder_link(
    link_id: str, payload: FounderLinkUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
):
    link = db.query(FounderLink).filter(FounderLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(link, key, value)
    db.commit()
    db.refresh(link)
    return link


@router.delete("/admin/founder/links/{link_id}", status_code=204)
def admin_delete_founder_link(link_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    link = db.query(FounderLink).filter(FounderLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()
    return


# ---------- Achievements ----------
@router.get("/admin/founder/achievements", response_model=list[FounderAchievementOut])
def admin_list_founder_achievements(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    profile = get_or_create_founder_profile(db)
    return (
        db.query(FounderAchievement)
        .filter(FounderAchievement.founder_id == profile.id)
        .order_by(FounderAchievement.display_order.asc())
        .all()
    )


@router.post("/admin/founder/achievements", response_model=FounderAchievementOut, status_code=201)
def admin_create_founder_achievement(
    payload: FounderAchievementCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
):
    profile = get_or_create_founder_profile(db)
    achievement = FounderAchievement(founder_id=profile.id, **payload.model_dump())
    db.add(achievement)
    db.commit()
    db.refresh(achievement)
    return achievement


@router.put("/admin/founder/achievements/{achievement_id}", response_model=FounderAchievementOut)
def admin_update_founder_achievement(
    achievement_id: str,
    payload: FounderAchievementUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    achievement = db.query(FounderAchievement).filter(FounderAchievement.id == achievement_id).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(achievement, key, value)
    db.commit()
    db.refresh(achievement)
    return achievement


@router.delete("/admin/founder/achievements/{achievement_id}", status_code=204)
def admin_delete_founder_achievement(
    achievement_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
):
    achievement = db.query(FounderAchievement).filter(FounderAchievement.id == achievement_id).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    db.delete(achievement)
    db.commit()
    return