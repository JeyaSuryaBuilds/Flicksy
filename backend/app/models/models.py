import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database.session import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)  # FlickTag, stored lowercase
    display_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    bio = Column(Text, default="")
    avatar_url = Column(String, default="")
    avatar_initials = Column(String, default="")
    website = Column(String, default="")
    pronouns = Column(String, default="")
    contact_info = Column(String, default="")  # freeform (email/phone/link) shown on public Space when show_contact is on
    show_contact = Column(Boolean, default=False)  # publicly show the Contact button/info on this Space
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  # Verified Space badge — admin-granted only
    is_email_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    stories = relationship("Story", back_populates="author", cascade="all, delete-orphan")


def normalize_flicktag(raw: str) -> str:
    """FlickTags are case-insensitive — always store/compare lowercase to prevent duplicates
    that differ only by case (e.g. 'Surya' vs 'surya')."""
    return raw.strip().lower()


class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "followee_id", name="uq_follow_pair"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    follower_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    followee_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, default=gen_uuid)
    author_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    caption = Column(Text, default="")
    location = Column(String, default="")
    media_type = Column(String, default="image")  # image | video
    media_tag = Column(String, default="")  # e.g. video duration label
    is_rush = Column(Boolean, default=False)  # True = Rush (short-video experience), False = normal Flick
    is_archived = Column(Boolean, default=False)  # hidden from feed/other viewers' Space grid; still visible to the owner
    is_pinned = Column(Boolean, default=False)  # shown first in the owner's own Space grid
    pinned_at = Column(DateTime, nullable=True)  # orders multiple pinned posts (most-recently-pinned first)
    sound_id = Column(String, ForeignKey("sounds.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    author = relationship("User", back_populates="posts")
    media = relationship("PostMedia", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="post", cascade="all, delete-orphan")


class PostMedia(Base):
    __tablename__ = "post_media"

    id = Column(String, primary_key=True, default=gen_uuid)
    post_id = Column(String, ForeignKey("posts.id"), nullable=False, index=True)
    url = Column(String, nullable=False)
    order_index = Column(Integer, default=0)

    post = relationship("Post", back_populates="media")


class Like(Base):
    __tablename__ = "likes"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_like_pair"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    post_id = Column(String, ForeignKey("posts.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="likes")


class Bookmark(Base):
    __tablename__ = "bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_bookmark_pair"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    post_id = Column(String, ForeignKey("posts.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="bookmarks")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True, default=gen_uuid)
    post_id = Column(String, ForeignKey("posts.id"), nullable=False, index=True)
    author_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    parent_id = Column(String, ForeignKey("comments.id"), nullable=True)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")
    likes = relationship("CommentLike", back_populates="comment", cascade="all, delete-orphan")


class CommentLike(Base):
    __tablename__ = "comment_likes"
    __table_args__ = (UniqueConstraint("user_id", "comment_id", name="uq_comment_like_pair"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    comment_id = Column(String, ForeignKey("comments.id"), nullable=False, index=True)

    comment = relationship("Comment", back_populates="likes")


class Story(Base):
    __tablename__ = "stories"

    id = Column(String, primary_key=True, default=gen_uuid)
    author_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    media_url = Column(String, default="")
    media_type = Column(String, default="image")  # image | video | text
    text_content = Column(Text, nullable=True)  # for text Moments
    sound_id = Column(String, ForeignKey("sounds.id"), nullable=True)
    overlay_data = Column(Text, nullable=True)  # JSON: text overlays, stickers, drawing strokes, filter id
    close_crew_only = Column(Boolean, default=False)
    allow_echo = Column(Boolean, default=True)
    allow_send_on = Column(Boolean, default=True)
    allow_recast = Column(Boolean, default=True)
    recast_of_id = Column(String, ForeignKey("stories.id"), nullable=True)  # set when this Moment is a Recast
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    author = relationship("User", back_populates="stories")
    views = relationship("StoryView", back_populates="story", cascade="all, delete-orphan")


class MomentEcho(Base):
    """Echo = Comment, scoped to Moments (Flicks/Comments use the existing Comment model)."""
    __tablename__ = "moment_echoes"

    id = Column(String, primary_key=True, default=gen_uuid)
    story_id = Column(String, ForeignKey("stories.id"), nullable=False, index=True)
    author_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    parent_id = Column(String, ForeignKey("moment_echoes.id"), nullable=True)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class MomentSendOn(Base):
    """Tracks a Moment being Sent On to a chat conversation, for view/analytics purposes."""
    __tablename__ = "moment_send_ons"

    id = Column(String, primary_key=True, default=gen_uuid)
    story_id = Column(String, ForeignKey("stories.id"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class StoryView(Base):
    __tablename__ = "story_views"
    __table_args__ = (UniqueConstraint("story_id", "viewer_id", name="uq_story_view_pair"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    story_id = Column(String, ForeignKey("stories.id"), nullable=False, index=True)
    viewer_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    viewed_at = Column(DateTime, default=datetime.utcnow)

    story = relationship("Story", back_populates="views")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=gen_uuid)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("ConversationMember", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class ConversationMember(Base):
    __tablename__ = "conversation_members"
    __table_args__ = (UniqueConstraint("conversation_id", "user_id", name="uq_conv_member"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="members")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    body = Column(Text, default="")
    media_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    read_at = Column(DateTime, nullable=True)

    conversation = relationship("Conversation", back_populates="messages")


class NotificationType(str, enum.Enum):
    like = "like"
    comment = "comment"
    follow = "follow"
    follow_request = "follow_request"
    mention = "mention"
    message = "message"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=gen_uuid)
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    actor_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    post_id = Column(String, ForeignKey("posts.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False, index=True)

    # Privacy
    is_private = Column(Boolean, default=False)
    who_can_message = Column(String, default="everyone")  # everyone | crew | none
    who_can_mention = Column(String, default="everyone")
    who_can_tag = Column(String, default="everyone")
    show_activity_status = Column(Boolean, default=True)
    show_read_receipts = Column(Boolean, default=True)

    # Notifications
    notify_loves = Column(Boolean, default=True)
    notify_talks = Column(Boolean, default=True)
    notify_new_crew = Column(Boolean, default=True)
    notify_mentions = Column(Boolean, default=True)
    notify_moments = Column(Boolean, default=True)
    notify_chats = Column(Boolean, default=True)
    notify_marketing = Column(Boolean, default=False)
    push_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)

    # Flicksy AI
    ai_enabled = Column(Boolean, default=True)
    ai_caption_assistance = Column(Boolean, default=True)
    ai_personalization = Column(Boolean, default=True)
    ai_data_sharing = Column(Boolean, default=True)

    # Content & media
    rush_autoplay = Column(Boolean, default=True)
    data_saver = Column(Boolean, default=False)
    wifi_only_upload = Column(Boolean, default=False)

    # Appearance
    theme = Column(String, default="dark")  # light | dark | system
    reduce_motion = Column(Boolean, default=False)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, default="New conversation")
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan")


class AIMessage(Base):
    __tablename__ = "ai_messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("ai_conversations.id"), nullable=False, index=True)
    role = Column(String, nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    provider = Column(String, nullable=True)  # gemini | openrouter | null for user messages
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("AIConversation", back_populates="messages")


class ReportTargetType(str, enum.Enum):
    post = "post"
    comment = "comment"
    user = "user"
    story = "story"


class ReportStatus(str, enum.Enum):
    pending = "pending"
    reviewed = "reviewed"
    dismissed = "dismissed"
    actioned = "actioned"


class Sound(Base):
    """SoundBox catalog entry. Architecture is provider-ready: `source` and `external_id`
    let this later point at a licensed catalog instead of user uploads."""
    __tablename__ = "sounds"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    artist = Column(String, default="")
    cover_url = Column(String, default="")
    audio_url = Column(String, default="")
    duration_seconds = Column(Integer, default=0)
    source = Column(String, default="original")  # original | catalog
    external_id = Column(String, nullable=True)  # id in a future licensed provider's catalog
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=True)  # set for Original Sound
    created_at = Column(DateTime, default=datetime.utcnow)


class SpaceThemePreset(str, enum.Enum):
    midnight = "midnight"
    sunset = "sunset"
    aurora = "aurora"
    minimal = "minimal"
    custom = "custom"


class SpaceTheme(Base):
    __tablename__ = "space_themes"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    preset = Column(Enum(SpaceThemePreset), default=SpaceThemePreset.midnight)

    background_color = Column(String, default="#15130F")
    background_gradient = Column(String, default="")  # CSS gradient string, optional
    background_image_url = Column(String, default="")
    accent_color = Column(String, default="#FF6B4A")
    card_style = Column(String, default="rounded")  # rounded | sharp | outlined
    button_style = Column(String, default="filled")  # filled | outline | soft
    font_style = Column(String, default="default")  # default | serif | mono
    avatar_frame = Column(String, default="none")  # none | ring | glow | dashed
    glow_effect = Column(Boolean, default=False)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FlashMessage(Base):
    """Flash: private, quick photo/video communication — distinct from persistent Chats messages."""
    __tablename__ = "flash_messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    media_url = Column(String, nullable=False)
    media_type = Column(String, default="image")  # image | video
    caption = Column(String, default="")
    reply_to_flash_id = Column(String, ForeignKey("flash_messages.id"), nullable=True)
    is_disappearing = Column(Boolean, default=True)
    delivered_at = Column(DateTime, default=datetime.utcnow)
    seen_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)  # soft delete/unsend
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class AdStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    active = "active"
    paused = "paused"
    ended = "ended"


class Ad(Base):
    __tablename__ = "ads"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    advertiser = Column(String, nullable=False)
    description = Column(Text, default="")
    media_url = Column(String, default="")
    cta_text = Column(String, default="Learn More")
    destination_url = Column(String, default="")
    status = Column(Enum(AdStatus), default=AdStatus.draft)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    targeting = Column(Text, default="")  # freeform JSON string — extend when real targeting exists
    budget_cents = Column(Integer, default=0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    spend_cents = Column(Integer, default=0)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=gen_uuid)
    reporter_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    target_type = Column(Enum(ReportTargetType), nullable=False)
    target_id = Column(String, nullable=False, index=True)
    reason = Column(String, nullable=False)
    details = Column(Text, default="")
    status = Column(Enum(ReportStatus), default=ReportStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    code = Column(String, nullable=False)  # 6-digit reset code sent to email
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)