import re
from typing import Optional

from sqlalchemy.orm import Session

from app.models.models import (
    FounderProfile,
    FounderProject,
    FounderSkill,
    FounderLink,
    FounderAchievement,
)


# ---------------------------------------------------------------------------
# Singleton profile access
# ---------------------------------------------------------------------------

def get_or_create_founder_profile(db: Session) -> FounderProfile:
    """
    There is exactly one founder profile row.

    If the row does not exist, create it with the confirmed founder identity.
    """
    profile = db.query(FounderProfile).first()

    if not profile:
        profile = FounderProfile(
            full_name="Jeya Surya B",
            public_name="Jeya Surya B",
            role="Founder / Creator of Flickzy",
            description=(
                "Flickzy is an original social media application "
                "created by Jeya Surya B."
            ),
            is_public=True,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile


def ensure_founder_seed(db: Session) -> None:
    """
    Ensure the confirmed founder identity exists.

    Existing founder information entered by the admin is preserved.
    Empty identity fields are safely filled with the confirmed identity.
    """
    profile = db.query(FounderProfile).first()

    if not profile:
        profile = FounderProfile(
            full_name="Jeya Surya B",
            public_name="Jeya Surya B",
            role="Founder / Creator of Flickzy",
            description=(
                "Flickzy is an original social media application "
                "created by Jeya Surya B."
            ),
            is_public=True,
        )
        db.add(profile)
        db.commit()
        return

    changed = False

    # These are confirmed identity fields and should never remain empty.
    if not (profile.full_name or "").strip():
        profile.full_name = "Jeya Surya B"
        changed = True

    if not (profile.public_name or "").strip():
        profile.public_name = "Jeya Surya B"
        changed = True

    if not (profile.role or "").strip():
        profile.role = "Founder / Creator of Flickzy"
        changed = True

    if not (profile.description or "").strip():
        profile.description = (
            "Flickzy is an original social media application "
            "created by Jeya Surya B."
        )
        changed = True

    if changed:
        db.commit()


# ---------------------------------------------------------------------------
# Founder-question detection
# ---------------------------------------------------------------------------

_FOUNDER_TERMS = [
    "founder",
    "founders",
    "creator of flickzy",
    "creator of flicksy",
    "who created flickzy",
    "who created flicksy",
    "who made flickzy",
    "who made flicksy",
    "who built flickzy",
    "who built flicksy",
    "who developed flickzy",
    "who developed flicksy",
    "who owns flickzy",
    "who owns flicksy",
    "who is behind flickzy",
    "who is behind flicksy",
    "who runs flickzy",
    "who runs flicksy",
    "jeya surya",
]

_WEAK_CREATOR_VERBS = [
    "created",
    "made",
    "built",
    "developed",
    "founded",
    "started",
]

_WHO_WORDS = ["who"]


def is_founder_question(message: str) -> bool:
    text = (message or "").lower()

    if not text.strip():
        return False

    if any(term in text for term in _FOUNDER_TERMS):
        return True

    if (
        "flickzy" in text
        and any(w in text for w in _WHO_WORDS)
        and any(v in text for v in _WEAK_CREATOR_VERBS)
    ):
        return True

    if (
        "flicksy" in text
        and any(w in text for w in _WHO_WORDS)
        and any(v in text for v in _WEAK_CREATOR_VERBS)
    ):
        return True

    return False


# ---------------------------------------------------------------------------
# Category classification
# ---------------------------------------------------------------------------

_CATEGORY_KEYWORDS = {
    "links": [
        "github",
        "portfolio",
        "linkedin",
        "freelance",
        "freelancing",
        "website",
        "link",
        "profile url",
        "demo link",
        "contact",
    ],
    "projects": [
        "project",
        "projects",
        "built",
        "build",
        "developed",
        "development",
        "app",
        "apps",
        "application",
        "work has",
        "other work",
        "portfolio piece",
    ],
    "skills": [
        "skill",
        "skills",
        "technology",
        "technologies",
        "tech stack",
        "stack",
        "programming language",
        "language",
        "framework",
        "library",
        "libraries",
        "database",
        "know",
        "expertise",
        "proficient",
    ],
    "achievements": [
        "achievement",
        "achievements",
        "certification",
        "certifications",
        "award",
        "awards",
        "accomplishment",
        "milestone",
    ],
    "flickzy_story": [
        "why",
        "vision",
        "mission",
        "goal",
        "goals",
        "origin",
        "story",
        "created flickzy",
        "founded flickzy",
        "future plans",
        "roadmap",
        "responsibilities",
        "current status",
    ],
}


def classify_founder_categories(message: str) -> set:
    text = (message or "").lower()
    categories = {"profile"}

    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            categories.add(category)

    return categories


# ---------------------------------------------------------------------------
# Context building
# ---------------------------------------------------------------------------

def _profile_block(profile: FounderProfile) -> str:
    """
    Always expose the confirmed founder identity.

    This is intentionally explicit so the AI cannot interpret an empty or
    incomplete database profile as meaning there is no known founder.
    """
    if not profile or not profile.is_public:
        return (
            "Founder identity:\n"
            "- Full name: Jeya Surya B\n"
            "- Role: Founder / Creator of Flickzy"
        )

    lines = [
        "Founder identity:",
        "- Full name: Jeya Surya B",
        "- Public name: Jeya Surya B",
        "- Role: Founder / Creator of Flickzy",
    ]

    field_labels = [
        ("professional_title", "Professional title"),
        ("short_bio", "Short bio"),
        ("detailed_bio", "Detailed bio"),
        ("description", "Description"),
        ("professional_background", "Professional background"),
        ("education", "Education"),
        ("interests", "Interests"),
        ("development_focus", "Development focus"),
        ("career_goals", "Career goals"),
        ("professional_strengths", "Professional strengths"),
        ("areas_of_expertise", "Areas of expertise"),
    ]

    for field, label in field_labels:
        value = (getattr(profile, field, "") or "").strip()

        if value:
            lines.append(f"- {label}: {value}")

    return "\n".join(lines)


def _flickzy_story_block(profile: FounderProfile) -> str:
    if not profile or not profile.is_public:
        return ""

    field_labels = [
        ("role_in_flickzy", "Founder's role in Flickzy"),
        ("why_flickzy_created", "Why Flickzy was created"),
        ("flickzy_origin_story", "Flickzy origin story"),
        ("flickzy_mission", "Flickzy mission"),
        ("flickzy_vision", "Flickzy vision"),
        ("flickzy_goals", "Flickzy goals"),
        ("founder_responsibilities", "Founder responsibilities in Flickzy"),
        ("flickzy_technologies", "Technologies used to build Flickzy"),
        ("development_status", "Current development status"),
        ("future_plans", "Future plans"),
    ]

    lines = []

    for field, label in field_labels:
        value = (getattr(profile, field, "") or "").strip()

        if value:
            lines.append(f"- {label}: {value}")

    if not lines:
        return ""

    return "Flickzy story (from the founder):\n" + "\n".join(lines)


def _projects_block(db: Session, founder_id: str) -> str:
    projects = (
        db.query(FounderProject)
        .filter(
            FounderProject.founder_id == founder_id,
            FounderProject.is_public == True,  # noqa: E712
        )
        .order_by(
            FounderProject.display_order.asc(),
            FounderProject.created_at.desc(),
        )
        .all()
    )

    if not projects:
        return "Founder projects: none recorded yet."

    lines = ["Founder projects:"]

    for project in projects:
        parts = [project.name]

        if project.short_description:
            parts.append(project.short_description)

        if project.technologies:
            parts.append(f"Technologies: {project.technologies}")

        if project.role:
            parts.append(f"Role: {project.role}")

        if project.status:
            parts.append(f"Status: {project.status}")

        if project.github_url:
            parts.append(f"GitHub: {project.github_url}")

        if project.live_url:
            parts.append(f"Live: {project.live_url}")

        if project.portfolio_url:
            parts.append(f"Portfolio: {project.portfolio_url}")

        lines.append("- " + " | ".join(parts))

    return "\n".join(lines)


def _skills_block(db: Session, founder_id: str) -> str:
    skills = (
        db.query(FounderSkill)
        .filter(
            FounderSkill.founder_id == founder_id,
            FounderSkill.is_public == True,  # noqa: E712
        )
        .order_by(
            FounderSkill.display_order.asc(),
            FounderSkill.category.asc(),
        )
        .all()
    )

    if not skills:
        return "Founder skills/technologies: none recorded yet."

    by_category = {}

    for skill in skills:
        by_category.setdefault(
            skill.category or "General",
            [],
        ).append(skill)

    lines = ["Founder skills/technologies:"]

    for category, items in by_category.items():
        names = []

        for skill in items:
            label = skill.name

            if skill.proficiency:
                label += f" ({skill.proficiency})"

            names.append(label)

        lines.append(f"- {category}: {', '.join(names)}")

    return "\n".join(lines)


def _links_block(db: Session, founder_id: str) -> str:
    links = (
        db.query(FounderLink)
        .filter(
            FounderLink.founder_id == founder_id,
            FounderLink.is_public == True,  # noqa: E712
        )
        .order_by(FounderLink.display_order.asc())
        .all()
    )

    if not links:
        return "Founder professional links: none recorded yet."

    lines = ["Founder professional links:"]

    for link in links:
        label = link.title or link.link_type
        lines.append(
            f"- {link.link_type}: {label} — {link.url}"
        )

    return "\n".join(lines)


def _achievements_block(db: Session, founder_id: str) -> str:
    achievements = (
        db.query(FounderAchievement)
        .filter(
            FounderAchievement.founder_id == founder_id,
            FounderAchievement.is_public == True,  # noqa: E712
        )
        .order_by(
            FounderAchievement.display_order.asc()
        )
        .all()
    )

    if not achievements:
        return "Founder achievements: none recorded yet."

    lines = ["Founder achievements:"]

    for achievement in achievements:
        parts = [achievement.title]

        if achievement.category:
            parts.append(achievement.category)

        if achievement.date_achieved:
            parts.append(achievement.date_achieved)

        if achievement.description:
            parts.append(achievement.description)

        lines.append("- " + " | ".join(parts))

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Founder context
# ---------------------------------------------------------------------------

def build_founder_context(db: Session, message: str) -> str:
    """
    Build the relevant founder knowledge context.

    The confirmed founder identity is ALWAYS included.
    Other categories are included only when relevant to the question.
    """
    profile = get_or_create_founder_profile(db)
    categories = classify_founder_categories(message)

    blocks = [_profile_block(profile)]

    if "flickzy_story" in categories:
        story = _flickzy_story_block(profile)

        if story:
            blocks.append(story)

    if "projects" in categories:
        blocks.append(
            _projects_block(db, profile.id)
        )

    if "skills" in categories:
        blocks.append(
            _skills_block(db, profile.id)
        )

    if "links" in categories:
        blocks.append(
            _links_block(db, profile.id)
        )

    if "achievements" in categories:
        blocks.append(
            _achievements_block(db, profile.id)
        )

    return "\n\n".join(
        block for block in blocks if block
    )


# ---------------------------------------------------------------------------
# Founder AI rules
# ---------------------------------------------------------------------------

FOUNDER_ANTI_HALLUCINATION_RULE = """
FOUNDER IDENTITY RULE — IMPORTANT:

Flickzy has one confirmed founder/creator.

The confirmed founder is:
Jeya Surya B.

Role:
Founder / Creator of Flickzy.

When the user asks who founded, created, built, developed, or made Flickzy,
answer that Jeya Surya B is the founder and creator.

Do NOT say that Flickzy has multiple founders.
Do NOT say that there is no single founder.
Do NOT invent a team as the founder.
Do NOT replace Jeya Surya B with another person.

If the user asks for additional personal information that is not present in
the Founder Knowledge below, say that the information is not available in
Flickzy's founder knowledge.

For founder identity questions, the confirmed identity above takes priority
over generic assumptions about how the app was created.
""".strip()


def build_founder_system_prompt(
    db: Session,
    message: str,
    base_system: str,
) -> str:
    """
    Combine the normal Flickzy AI instructions with the founder-specific
    source-of-truth rules and retrieved founder information.
    """
    context = build_founder_context(db, message)

    return (
        f"{base_system}\n\n"
        f"{FOUNDER_ANTI_HALLUCINATION_RULE}\n\n"
        f"Founder Knowledge (from database):\n"
        f"{context}"
    )