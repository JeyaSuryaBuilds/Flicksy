from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)
    display_name: str = Field(min_length=1, max_length=60)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserPublic"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=8, max_length=128)


# ---------- Users ----------
class UserPublic(BaseModel):
    id: str
    username: str
    display_name: str
    bio: str = ""
    avatar_url: str = ""
    avatar_initials: str = ""
    website: str = ""
    pronouns: str = ""
    is_verified: bool = False
    is_admin: bool = False
    is_private: bool = False
    is_email_verified: bool = False
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    is_following: bool = False
    is_followed_by: bool = False
    can_view_content: bool = True
    show_contact: bool = False
    # Only populated when show_contact is True (or the viewer is the owner) — see
    # serialize_user. Kept empty otherwise so it never leaks to viewers who shouldn't see it.
    contact_info: str = ""

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    username: Optional[str] = None  # FlickTag change — validated for uniqueness server-side
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    website: Optional[str] = None
    pronouns: Optional[str] = None
    contact_info: Optional[str] = None
    show_contact: Optional[bool] = None


class FlickTagAvailability(BaseModel):
    username: str
    available: bool


# ---------- Posts ----------
class PostMediaOut(BaseModel):
    id: str
    url: str
    order_index: int = 0

    class Config:
        from_attributes = True


class PostCreate(BaseModel):
    caption: str = ""
    location: str = ""
    media_type: str = "image"
    media_tag: str = ""
    media_urls: List[str] = []
    is_rush: bool = False
    sound_id: Optional[str] = None


class PostOut(BaseModel):
    id: str
    author: UserPublic
    caption: str
    location: str
    media_type: str
    media_tag: str
    media: List[PostMediaOut] = []
    is_rush: bool = False
    is_archived: bool = False
    is_pinned: bool = False
    sound_id: Optional[str] = None
    processing_status: str = "ready"
    processing_error: str = ""
    like_count: int = 0
    comment_count: int = 0
    is_liked: bool = False
    is_bookmarked: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class FeedResponse(BaseModel):
    posts: List[PostOut]
    next_cursor: Optional[str] = None


# ---------- Comments ----------
class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=500)
    parent_id: Optional[str] = None


class CommentOut(BaseModel):
    id: str
    post_id: str
    author: UserPublic
    body: str
    like_count: int = 0
    is_liked: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Stories ----------
class StoryOut(BaseModel):
    id: str
    author: UserPublic
    media_url: str
    created_at: datetime
    viewed: bool = False

    class Config:
        from_attributes = True


# ---------- Messages ----------
class MessageCreate(BaseModel):
    body: str = ""
    media_url: Optional[str] = None


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    body: str
    media_url: Optional[str] = None
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: str
    other_user: UserPublic
    last_message: Optional[MessageOut] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


# ---------- Notifications ----------
class NotificationOut(BaseModel):
    id: str
    type: str
    actor: UserPublic
    post_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Search ----------
class SearchResponse(BaseModel):
    users: List[UserPublic] = []
    posts: List[PostOut] = []


TokenResponse.model_rebuild()