from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# ---------- Founder Profile ----------
class FounderProfileOut(BaseModel):
    id: str
    full_name: str = ""
    public_name: str = ""
    role: str = ""
    professional_title: str = ""
    short_bio: str = ""
    detailed_bio: str = ""
    description: str = ""
    professional_background: str = ""
    education: str = ""
    role_in_flickzy: str = ""
    why_flickzy_created: str = ""
    flickzy_origin_story: str = ""
    flickzy_mission: str = ""
    flickzy_vision: str = ""
    flickzy_goals: str = ""
    founder_responsibilities: str = ""
    flickzy_technologies: str = ""
    development_status: str = ""
    future_plans: str = ""
    interests: str = ""
    development_focus: str = ""
    career_goals: str = ""
    professional_strengths: str = ""
    areas_of_expertise: str = ""
    is_public: bool = True
    updated_at: datetime

    class Config:
        from_attributes = True


class FounderProfileUpdate(BaseModel):
    """All fields optional — admin only ever sends what's actually changing.
    Only explicitly-provided values are ever written; nothing is inferred."""
    full_name: Optional[str] = None
    public_name: Optional[str] = None
    role: Optional[str] = None
    professional_title: Optional[str] = None
    short_bio: Optional[str] = None
    detailed_bio: Optional[str] = None
    description: Optional[str] = None
    professional_background: Optional[str] = None
    education: Optional[str] = None
    role_in_flickzy: Optional[str] = None
    why_flickzy_created: Optional[str] = None
    flickzy_origin_story: Optional[str] = None
    flickzy_mission: Optional[str] = None
    flickzy_vision: Optional[str] = None
    flickzy_goals: Optional[str] = None
    founder_responsibilities: Optional[str] = None
    flickzy_technologies: Optional[str] = None
    development_status: Optional[str] = None
    future_plans: Optional[str] = None
    interests: Optional[str] = None
    development_focus: Optional[str] = None
    career_goals: Optional[str] = None
    professional_strengths: Optional[str] = None
    areas_of_expertise: Optional[str] = None
    is_public: Optional[bool] = None


# ---------- Founder Projects ----------
class FounderProjectCreate(BaseModel):
    name: str
    short_description: str = ""
    detailed_description: str = ""
    category: str = ""
    technologies: str = ""
    role: str = ""
    status: str = ""
    github_url: str = ""
    live_url: str = ""
    portfolio_url: str = ""
    display_order: int = 0
    is_public: bool = True


class FounderProjectUpdate(BaseModel):
    name: Optional[str] = None
    short_description: Optional[str] = None
    detailed_description: Optional[str] = None
    category: Optional[str] = None
    technologies: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    display_order: Optional[int] = None
    is_public: Optional[bool] = None


class FounderProjectOut(BaseModel):
    id: str
    name: str
    short_description: str = ""
    detailed_description: str = ""
    category: str = ""
    technologies: str = ""
    role: str = ""
    status: str = ""
    github_url: str = ""
    live_url: str = ""
    portfolio_url: str = ""
    display_order: int = 0
    is_public: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Founder Skills ----------
class FounderSkillCreate(BaseModel):
    name: str
    category: str = ""
    proficiency: Optional[str] = None
    description: str = ""
    display_order: int = 0
    is_public: bool = True


class FounderSkillUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    proficiency: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_public: Optional[bool] = None


class FounderSkillOut(BaseModel):
    id: str
    name: str
    category: str = ""
    proficiency: Optional[str] = None
    description: str = ""
    display_order: int = 0
    is_public: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Founder Links ----------
class FounderLinkCreate(BaseModel):
    link_type: str
    title: str = ""
    url: str
    description: str = ""
    display_order: int = 0
    is_public: bool = True


class FounderLinkUpdate(BaseModel):
    link_type: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_public: Optional[bool] = None


class FounderLinkOut(BaseModel):
    id: str
    link_type: str
    title: str = ""
    url: str
    description: str = ""
    display_order: int = 0
    is_public: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Founder Achievements ----------
class FounderAchievementCreate(BaseModel):
    title: str
    description: str = ""
    category: str = ""
    date_achieved: str = ""
    display_order: int = 0
    is_public: bool = True


class FounderAchievementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    date_achieved: Optional[str] = None
    display_order: Optional[int] = None
    is_public: Optional[bool] = None


class FounderAchievementOut(BaseModel):
    id: str
    title: str
    description: str = ""
    category: str = ""
    date_achieved: str = ""
    display_order: int = 0
    is_public: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Composite ----------
class FounderKnowledgeOut(BaseModel):
    """Everything the AI / a client could want about the founder in one call —
    public rows only. Used by GET /founder/knowledge and internally by the AI
    founder-context builder (which further filters down to relevant categories
    only, rather than always sending all of this)."""
    profile: Optional[FounderProfileOut] = None
    projects: List[FounderProjectOut] = []
    skills: List[FounderSkillOut] = []
    links: List[FounderLinkOut] = []
    achievements: List[FounderAchievementOut] = []