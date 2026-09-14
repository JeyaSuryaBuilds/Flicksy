export interface UserPublic {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  avatar_initials: string;
  website: string;
  pronouns: string;
  is_verified: boolean;
  is_email_verified: boolean;
  is_admin: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following: boolean;
  is_followed_by: boolean;
  show_contact: boolean;
  contact_info: string;
}

export interface PostMedia {
  id: string;
  url: string;
  order_index: number;
}

export interface Post {
  id: string;
  author: UserPublic;
  caption: string;
  location: string;
  media_type: "image" | "video";
  media_tag: string;
  media: PostMedia[];
  is_rush: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  sound_id?: string | null;
  processing_status: "ready" | "processing" | "failed";
  processing_error: string;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  created_at: string;
}

export interface FeedResponse {
  posts: Post[];
  next_cursor: string | null;
}

export interface Comment {
  id: string;
  post_id: string;
  author: UserPublic;
  body: string;
  like_count: number;
  is_liked: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  media_url?: string | null;
  created_at: string;
  read_at?: string | null;
}

export interface Conversation {
  id: string;
  other_user: UserPublic;
  last_message: Message | null;
  unread_count: number;
}

export interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "follow_request" | "mention" | "message";
  actor: UserPublic;
  post_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Moment {
  id: string;
  author_id: string;
  media_url: string;
  media_type: "image" | "video" | "text";
  text_content?: string | null;
  sound_id?: string | null;
  overlay_data?: string | null;
  allow_echo: boolean;
  allow_send_on: boolean;
  allow_recast: boolean;
  recast_of_id?: string | null;
  created_at: string;
  expires_at: string | null;
  viewed: boolean;
  view_count: number;
  echo_count: number;
}

export interface MomentAuthorGroup {
  author_id: string;
  author_username: string;
  author_avatar_url: string;
  author_avatar_initials: string;
  moments: Moment[];
  all_viewed: boolean;
}

export interface UserSettings {
  is_private: boolean;
  who_can_message: string;
  who_can_mention: string;
  who_can_tag: string;
  show_activity_status: boolean;
  show_read_receipts: boolean;
  notify_loves: boolean;
  notify_talks: boolean;
  notify_new_crew: boolean;
  notify_mentions: boolean;
  notify_moments: boolean;
  notify_chats: boolean;
  notify_marketing: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  ai_enabled: boolean;
  ai_caption_assistance: boolean;
  ai_personalization: boolean;
  ai_data_sharing: boolean;
  rush_autoplay: boolean;
  data_saver: boolean;
  wifi_only_upload: boolean;
  theme: string;
  reduce_motion: boolean;
}

export interface AIConversation {
  id: string;
  title: string;
  created_at: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserPublic;
}