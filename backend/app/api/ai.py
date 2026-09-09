from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, AIConversation, AIMessage
from app.schemas.extended_schemas import (
    AIChatRequest, AIChatResponse, AIConversationOut, AIMessageOut,
    CaptionGenerateRequest, TopicTagSuggestRequest, BioGenerateRequest,
)
from app.auth.dependencies import get_current_user
from app.services.ai_service import (
    generate_ai_text, CHAT_SYSTEM, CAPTION_SYSTEM, BIO_SYSTEM, TOPIC_TAG_SYSTEM,
    build_caption_prompt, build_bio_prompt, build_topic_tag_prompt,
)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/conversations", response_model=list[AIConversationOut])
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(AIConversation)
        .filter(AIConversation.user_id == current_user.id)
        .order_by(AIConversation.created_at.desc())
        .all()
    )


@router.get("/conversations/{conversation_id}/messages", response_model=list[AIMessageOut])
def get_conversation_messages(
    conversation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    conversation = (
        db.query(AIConversation)
        .filter(AIConversation.id == conversation_id, AIConversation.user_id == current_user.id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return (
        db.query(AIMessage)
        .filter(AIMessage.conversation_id == conversation_id)
        .order_by(AIMessage.created_at.asc())
        .all()
    )


@router.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conversation = (
        db.query(AIConversation)
        .filter(AIConversation.id == conversation_id, AIConversation.user_id == current_user.id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conversation)
    db.commit()
    return


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat(
    payload: AIChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if payload.conversation_id:
        conversation = (
            db.query(AIConversation)
            .filter(AIConversation.id == payload.conversation_id, AIConversation.user_id == current_user.id)
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = AIConversation(user_id=current_user.id, title=payload.message[:60])
        db.add(conversation)
        db.flush()

    db.add(AIMessage(conversation_id=conversation.id, role="user", content=payload.message))

    prompt = payload.message if not payload.context else f"{payload.message}\n\nContext:\n{payload.context}"
    reply_text, provider = await generate_ai_text(prompt, system=CHAT_SYSTEM)

    db.add(AIMessage(conversation_id=conversation.id, role="assistant", content=reply_text, provider=provider))
    db.commit()

    return AIChatResponse(conversation_id=conversation.id, reply=reply_text, provider=provider)


@router.post("/caption")
async def generate_caption(payload: CaptionGenerateRequest, current_user: User = Depends(get_current_user)):
    prompt = build_caption_prompt(payload.description, payload.tone or "casual", payload.improve_existing)
    text, provider = await generate_ai_text(prompt, system=CAPTION_SYSTEM)
    return {"caption": text, "provider": provider}


@router.post("/bio")
async def generate_bio(payload: BioGenerateRequest, current_user: User = Depends(get_current_user)):
    prompt = build_bio_prompt(payload.prompt, payload.improve_existing)
    text, provider = await generate_ai_text(prompt, system=BIO_SYSTEM)
    return {"bio": text, "provider": provider}


@router.post("/topic-tags")
async def suggest_topic_tags(payload: TopicTagSuggestRequest, current_user: User = Depends(get_current_user)):
    prompt = build_topic_tag_prompt(payload.caption)
    text, provider = await generate_ai_text(prompt, system=TOPIC_TAG_SYSTEM)
    tags = [t.strip().lstrip("#") for t in text.replace("\n", ",").split(",") if t.strip()]
    return {"tags": tags, "provider": provider}
