import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { ProfileHeader } from "../components/ProfileHeader";
import { MediaGrid } from "../components/MediaGrid";
import { PostCard } from "../components/PostCard";
import { CommentsSheet } from "../components/CommentsSheet";
import { RushShareSheet } from "../components/RushShareSheet";
import { UserListModal } from "../components/UserListModal";
import { Modal } from "../components/Modal";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { SpaceThemeWrapper } from "../components/SpaceThemeWrapper";
import { CloseIcon, ImageIcon } from "../components/icons";
import * as usersApi from "../services/users";
import { likePost, unlikePost, bookmarkPost, unbookmarkPost } from "../services/posts";
import { startConversation } from "../services/messages";
import { resolveMediaUrl } from "../utils/media";
import * as spaceThemeApi from "../services/spaceTheme";
import type { SpaceTheme } from "../services/spaceTheme";
import { useToast } from "../components/Toast";
import type { Post, UserPublic } from "../types";
import profileStyles from "./Profile.module.css";

const FLICKZY_WEB_URL = "https://flickzy-eight.vercel.app";

export function OtherUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [profileUser, setProfileUser] = useState<UserPublic | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [theme, setTheme] = useState<SpaceTheme | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const [crewOpen, setCrewOpen] = useState(false);
  const [circlesOpen, setCirclesOpen] = useState(false);
  const [crewUsers, setCrewUsers] = useState<UserPublic[]>([]);
  const [circleUsers, setCircleUsers] = useState<UserPublic[]>([]);
  const [isCrewLoading, setIsCrewLoading] = useState(false);
  const [isCirclesLoading, setIsCirclesLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    setTheme(null);
    Promise.all([usersApi.getUser(userId), usersApi.getUserPosts(userId)])
      .then(([u, userPosts]) => {
        setProfileUser(u);
        setPosts(userPosts);
      })
      .catch(() => showToast("Couldn't load this Space", "error"))
      .finally(() => setIsLoading(false));
    // Real backend-persisted theme — this is what the owner actually chose, not a local setting.
    spaceThemeApi.getUserSpaceTheme(userId).then(setTheme).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!profileUser) return;
    const wasFollowing = profileUser.is_following;
    setProfileUser({
      ...profileUser,
      is_following: !wasFollowing,
      followers_count: profileUser.followers_count + (wasFollowing ? -1 : 1),
    });
    try {
      if (wasFollowing) await usersApi.unfollowUser(profileUser.id);
      else await usersApi.followUser(profileUser.id);
    } catch {
      setProfileUser(profileUser);
      showToast("Couldn't update follow status", "error");
    }
  };

  const handleMessage = async () => {
    if (!profileUser) return;
    try {
      const conversation = await startConversation(profileUser.id);
      navigate(`/messages/${conversation.id}`);
    } catch {
      showToast("Couldn't start a Chat", "error");
    }
  };

  const handleShareSpace = async () => {
  if (!profileUser) return;

  // Always use the public Flickzy web URL.
  // Do not use window.location.origin because APK/Electron can return localhost.
  const url = `https://flickzy-eight.vercel.app/users/${profileUser.id}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${profileUser.display_name} on Flickzy`,
        url,
      });
    } catch {
      // User cancelled native share.
    }
    return;
  }

   try {
    await navigator.clipboard.writeText(url);
    showToast("Space link copied", "success");
   } catch {
    showToast("Couldn't copy the link", "error");
   }
  };

  const patchPost = (postId: string, patch: Partial<Post>) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)));
    setSelectedPost((prev) => (prev && prev.id === postId ? { ...prev, ...patch } : prev));
  };

  const handleLikeToggle = async (post: Post) => {
    const wasLiked = post.is_liked;
    patchPost(post.id, { is_liked: !wasLiked, like_count: post.like_count + (wasLiked ? -1 : 1) });
    try {
      if (wasLiked) await unlikePost(post.id);
      else await likePost(post.id);
    } catch {
      patchPost(post.id, { is_liked: wasLiked, like_count: post.like_count });
    }
  };

  const handleBookmarkToggle = async (post: Post) => {
    const wasBookmarked = post.is_bookmarked;
    patchPost(post.id, { is_bookmarked: !wasBookmarked });
    try {
      if (wasBookmarked) await unbookmarkPost(post.id);
      else await bookmarkPost(post.id);
    } catch {
      patchPost(post.id, { is_bookmarked: wasBookmarked });
    }
  };

  const openCrew = () => {
    if (!profileUser) return;
    setCrewOpen(true);
    setIsCrewLoading(true);
    usersApi.getFollowers(profileUser.id).then(setCrewUsers).finally(() => setIsCrewLoading(false));
  };

  const openCircles = () => {
    if (!profileUser) return;
    setCirclesOpen(true);
    setIsCirclesLoading(true);
    usersApi.getFollowing(profileUser.id).then(setCircleUsers).finally(() => setIsCirclesLoading(false));
  };

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (!profileUser) {
    return (
      <AppLayout>
        <EmptyState icon={<ImageIcon />} title="Space not found" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SpaceThemeWrapper theme={theme}>
        <ProfileHeader
          user={profileUser}
          isOwnProfile={false}
          onFollowToggle={handleFollowToggle}
          onMessage={handleMessage}
          onShareSpace={handleShareSpace}
          onContactClick={() => setIsContactOpen(true)}
          onCrewClick={openCrew}
          onCirclesClick={openCircles}
        />
        <div className={profileStyles.tabs}>
          <span className={profileStyles.tabActive}>Flicks</span>
        </div>
        {posts.length === 0 ? (
          <EmptyState icon={<ImageIcon />} title="No Flicks yet" />
        ) : (
          <MediaGrid posts={posts} onSelect={setSelectedPost} />
        )}
      </SpaceThemeWrapper>

      {selectedPost && (
        <div className={profileStyles.detailBackdrop} onClick={() => setSelectedPost(null)}>
          <div className={profileStyles.detailSheet} onClick={(e) => e.stopPropagation()}>
            <div className={profileStyles.detailHeader}>
              <button
                type="button"
                className={profileStyles.detailClose}
                onClick={() => setSelectedPost(null)}
                aria-label="Close"
              >
                <CloseIcon size={20} />
              </button>
            </div>
            <div className={profileStyles.detailScroll}>
              <PostCard
                post={selectedPost}
                onLikeToggle={handleLikeToggle}
                onBookmarkToggle={handleBookmarkToggle}
                onCommentClick={setCommentPost}
                onShareClick={setSharePost}
              />
            </div>
          </div>
        </div>
      )}

      {commentPost && (
        <CommentsSheet
          post={commentPost}
          onClose={() => setCommentPost(null)}
          onCommentCountChange={(count) => patchPost(commentPost.id, { comment_count: count })}
        />
      )}

      {sharePost && (
        <RushShareSheet
          isOpen={true}
          onClose={() => setSharePost(null)}
          postId={sharePost.id}
          mediaUrl={resolveMediaUrl(sharePost.media?.[0]?.url)}
          mediaType={sharePost.media_type}
          caption={sharePost.caption}
          contentType="post"
        />
      )}

      {crewOpen && (
        <UserListModal
          title="Crew"
          users={crewUsers}
          isLoading={isCrewLoading}
          emptyMessage="No Crew yet"
          onClose={() => setCrewOpen(false)}
          onUserClick={() => setCrewOpen(false)}
        />
      )}

      {circlesOpen && (
        <UserListModal
          title="Circles"
          users={circleUsers}
          isLoading={isCirclesLoading}
          emptyMessage="Not following anyone yet"
          onClose={() => setCirclesOpen(false)}
          onUserClick={() => setCirclesOpen(false)}
        />
      )}

      <Modal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} title={`Contact ${profileUser.display_name}`}>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-cream)" }}>
          {profileUser.contact_info || "No contact info provided."}
        </p>
      </Modal>
    </AppLayout>
  );
}