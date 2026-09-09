from sqlalchemy.orm import Session

from app.models.models import Notification, NotificationType, UserSettings

# Maps each NotificationType to the UserSettings column that gates it.
# If the recipient has that toggle off, we don't create the row at all —
# not "create it but hide it," actually don't generate it.
_SETTINGS_GATE = {
    NotificationType.like: "notify_loves",
    NotificationType.comment: "notify_talks",
    NotificationType.follow: "notify_new_crew",
    NotificationType.follow_request: "notify_new_crew",
    NotificationType.mention: "notify_mentions",
    NotificationType.message: "notify_chats",
}


def notify(db: Session, recipient_id: str, actor_id: str, ntype: NotificationType, post_id: str = None) -> None:
    if recipient_id == actor_id:
        return  # never notify yourself

    settings = db.query(UserSettings).filter(UserSettings.user_id == recipient_id).first()
    gate_field = _SETTINGS_GATE.get(ntype)
    if settings is not None and gate_field is not None and not getattr(settings, gate_field):
        return  # recipient turned this category off — don't generate it

    db.add(Notification(recipient_id=recipient_id, actor_id=actor_id, type=ntype, post_id=post_id))
