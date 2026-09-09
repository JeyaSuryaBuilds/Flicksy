from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


# ---------- Moments (Story) ----------
class MomentCreate(BaseModel):
    media_url: str = ""
    media_type: str = "image"  # image | video | text
    text_content: Optional[str] = None
    sound_id: Optional[str] = None
    overlay_data: Optional[str] = None  # JSON string: text overlays, stickers, drawing strokes, filter id
    close_crew_only: bool = False
    allow_echo: bool = True
    allow_send_on: bool = True
    allow_recast: bool = True


class MomentAuthorGroup(BaseModel):
    author_id: str
    author_username: str
    author_avatar_url: str
    author_avatar_initials: str
    moments: List["MomentOut"]
    all_viewed: bool = False


class MomentOut(BaseModel):
    id: str
    author_id: str
    media_url: str
    media_type: str = "image"
    text_content: Optional[str] = None
    sound_id: Optional[str] = None
    overlay_data: Optional[str] = None
    allow_echo: bool = True
    allow_send_on: bool = True
    allow_recast: bool = True
    recast_of_id: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    viewed: bool = False
    view_count: int = 0
    echo_count: int = 0

    class Config:
        from_attributes = True


class MomentEchoCreate(BaseModel):
    body: str


class MomentEchoOut(BaseModel):
    id: str
    story_id: str
    author_id: str
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


class MomentSendOnCreate(BaseModel):
    conversation_id: str


class MomentRecastCreate(BaseModel):
    caption: Optional[str] = None


# ---------- Settings ----------
class UserSettingsOut(BaseModel):
    is_private: bool
    who_can_message: str
    who_can_mention: str
    who_can_tag: str
    show_activity_status: bool
    show_read_receipts: bool

    notify_loves: bool
    notify_talks: bool
    notify_new_crew: bool
    notify_mentions: bool
    notify_moments: bool
    notify_chats: bool
    notify_marketing: bool
    push_enabled: bool
    email_enabled: bool

    ai_enabled: bool
    ai_caption_assistance: bool
    ai_personalization: bool
    ai_data_sharing: bool

    rush_autoplay: bool
    data_saver: bool
    wifi_only_upload: bool

    theme: str
    reduce_motion: bool

    class Config:
        from_attributes = True


class UserSettingsUpdate(BaseModel):
    is_private: Optional[bool] = None
    who_can_message: Optional[str] = None
    who_can_mention: Optional[str] = None
    who_can_tag: Optional[str] = None
    show_activity_status: Optional[bool] = None
    show_read_receipts: Optional[bool] = None

    notify_loves: Optional[bool] = None
    notify_talks: Optional[bool] = None
    notify_new_crew: Optional[bool] = None
    notify_mentions: Optional[bool] = None
    notify_moments: Optional[bool] = None
    notify_chats: Optional[bool] = None
    notify_marketing: Optional[bool] = None
    push_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None

    ai_enabled: Optional[bool] = None
    ai_caption_assistance: Optional[bool] = None
    ai_personalization: Optional[bool] = None
    ai_data_sharing: Optional[bool] = None

    rush_autoplay: Optional[bool] = None
    data_saver: Optional[bool] = None
    wifi_only_upload: Optional[bool] = None

    theme: Optional[str] = None
    reduce_motion: Optional[bool] = None


# ---------- Flicksy AI ----------
class AIChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context: Optional[str] = None  # e.g. a caption draft or image description to react to


class AIChatResponse(BaseModel):
    conversation_id: str
    reply: str
    provider: str


class AIConversationOut(BaseModel):
    id: str
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


class AIMessageOut(BaseModel):
    id: str
    role: str
    content: str
    provider: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CaptionGenerateRequest(BaseModel):
    description: str  # what the Flick/Rush shows, or a rough draft caption
    tone: Optional[str] = "casual"  # casual | funny | poetic | professional
    improve_existing: bool = False


class TopicTagSuggestRequest(BaseModel):
    caption: str


class BioGenerateRequest(BaseModel):
    prompt: str  # e.g. "photographer based in Chennai, loves street food"
    improve_existing: bool = False



# ---------- Reports ----------
class ReportCreate(BaseModel):
    target_type: str  # post | comment | user | story
    target_id: str
    reason: str
    details: str = ""


class ReportOut(BaseModel):
    id: str
    target_type: str
    target_id: str
    reason: str
    details: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True



# ---------- Space Theme ----------
class SpaceThemeOut(BaseModel):
    preset: str
    background_color: str
    background_gradient: str
    background_image_url: str
    accent_color: str
    card_style: str
    button_style: str
    font_style: str
    avatar_frame: str
    glow_effect: bool

    class Config:
        from_attributes = True


class SpaceThemeUpdate(BaseModel):
    preset: Optional[str] = None
    background_color: Optional[str] = None
    background_gradient: Optional[str] = None
    background_image_url: Optional[str] = None
    accent_color: Optional[str] = None
    card_style: Optional[str] = None
    button_style: Optional[str] = None
    font_style: Optional[str] = None
    avatar_frame: Optional[str] = None
    glow_effect: Optional[bool] = None


MomentAuthorGroup.model_rebuild()
