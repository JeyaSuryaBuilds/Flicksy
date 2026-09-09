from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, Conversation, ConversationMember, Message, UserSettings, Follow
from app.schemas.schemas import ConversationOut, MessageOut, MessageCreate
from app.auth.dependencies import get_current_user
from app.utils.serializers import serialize_user

router = APIRouter(prefix="/messages", tags=["messages"])


def _other_member(db: Session, conversation_id: str, current_user_id: str) -> User:
    member_row = (
        db.query(ConversationMember)
        .filter(ConversationMember.conversation_id == conversation_id, ConversationMember.user_id != current_user_id)
        .first()
    )
    return db.query(User).get(member_row.user_id) if member_row else None


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    memberships = (
        db.query(ConversationMember).filter(ConversationMember.user_id == current_user.id).all()
    )
    results = []
    for m in memberships:
        other = _other_member(db, m.conversation_id, current_user.id)
        if not other:
            continue
        last_message = (
            db.query(Message)
            .filter(Message.conversation_id == m.conversation_id)
            .order_by(Message.created_at.desc())
            .first()
        )
        unread_count = (
            db.query(Message)
            .filter(
                Message.conversation_id == m.conversation_id,
                Message.sender_id != current_user.id,
                Message.read_at.is_(None),
            )
            .count()
        )
        results.append(
            ConversationOut(
                id=m.conversation_id,
                other_user=serialize_user(db, other, current_user),
                last_message=MessageOut.model_validate(last_message) if last_message else None,
                unread_count=unread_count,
            )
        )
    results.sort(key=lambda c: c.last_message.created_at if c.last_message else datetime.min, reverse=True)
    return results


@router.get("/{conversation_id}", response_model=list[MessageOut])
def get_conversation_messages(
    conversation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    membership = (
        db.query(ConversationMember)
        .filter(ConversationMember.conversation_id == conversation_id, ConversationMember.user_id == current_user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    # Mark incoming messages as read
    unread = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != current_user.id,
            Message.read_at.is_(None),
        )
        .all()
    )
    for msg in unread:
        msg.read_at = datetime.utcnow()
    if unread:
        db.commit()

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return [MessageOut.model_validate(m) for m in messages]


@router.post("/{conversation_id}", response_model=MessageOut, status_code=201)
def send_message(
    conversation_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = (
        db.query(ConversationMember)
        .filter(ConversationMember.conversation_id == conversation_id, ConversationMember.user_id == current_user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        body=payload.body,
        media_url=payload.media_url,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return MessageOut.model_validate(message)


@router.post("/start/{user_id}", response_model=ConversationOut)
def start_conversation(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Find or create a 1:1 conversation with the given user."""
    other = db.query(User).filter(User.id == user_id).first()
    if not other:
        raise HTTPException(status_code=404, detail="User not found")

    # Enforce who_can_message — real backend authorization, not a hidden frontend button.
    other_settings = db.query(UserSettings).filter(UserSettings.user_id == other.id).first()
    who_can_message = other_settings.who_can_message if other_settings else "everyone"
    if who_can_message == "none":
        raise HTTPException(status_code=403, detail=f"@{other.username} isn't accepting Chats right now")
    if who_can_message == "crew":
        is_crew = (
            db.query(Follow).filter(Follow.follower_id == other.id, Follow.followee_id == current_user.id).first()
            is not None
        )
        if not is_crew:
            raise HTTPException(status_code=403, detail=f"@{other.username} only accepts Chats from their Crew")

    my_conversation_ids = {
        m.conversation_id
        for m in db.query(ConversationMember).filter(ConversationMember.user_id == current_user.id).all()
    }
    their_conversation_ids = {
        m.conversation_id
        for m in db.query(ConversationMember).filter(ConversationMember.user_id == user_id).all()
    }
    shared = my_conversation_ids & their_conversation_ids

    if shared:
        conversation_id = next(iter(shared))
    else:
        conversation = Conversation()
        db.add(conversation)
        db.flush()
        db.add(ConversationMember(conversation_id=conversation.id, user_id=current_user.id))
        db.add(ConversationMember(conversation_id=conversation.id, user_id=user_id))
        db.commit()
        conversation_id = conversation.id

    return ConversationOut(
        id=conversation_id,
        other_user=serialize_user(db, other, current_user),
        last_message=None,
        unread_count=0,
    )
