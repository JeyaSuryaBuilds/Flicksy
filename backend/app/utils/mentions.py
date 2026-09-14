import re

from sqlalchemy.orm import Session

from app.models.models import User, NotificationType
from app.services.notification_service import notify

# Matches the same FlickTag character set allowed at registration (see
# normalize_flicktag) — letters, numbers, underscore, dot, 3-32 chars.
MENTION_RE = re.compile(r"(?<!\w)@([A-Za-z0-9_.]{3,32})")


def extract_mentioned_usernames(text: str) -> list[str]:
    """Pulls unique @username mentions out of free text (captions, comments).
    Returns lowercase usernames (FlickTags are stored/compared lowercase)."""
    if not text:
        return []

    seen: set[str] = set()
    result: list[str] = []
    for match in MENTION_RE.finditer(text):
        username = match.group(1).lower()
        if username not in seen:
            seen.add(username)
            result.append(username)
    return result


def notify_mentioned_users(db: Session, text: str, actor: User, post_id: str = None) -> None:
    """Looks up each @username mentioned in text and creates a real mention
    notification for the corresponding account, if one exists. Names that don't
    match an existing FlickTag are silently skipped — mentions are best-effort
    text parsing, not validated at type time (unlike the Tag UI's autocomplete,
    which only ever lets you pick a real Crew/Circles member to begin with)."""
    usernames = extract_mentioned_usernames(text)
    if not usernames:
        return

    mentioned_users = db.query(User).filter(User.username.in_(usernames)).all()
    for mentioned in mentioned_users:
        notify(db, recipient_id=mentioned.id, actor_id=actor.id, ntype=NotificationType.mention, post_id=post_id)