import { useCallback, useEffect, useRef, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { StoryAvatar } from "../components/StoryAvatar";
import { PostCard } from "../components/PostCard";
import { MomentViewer } from "../components/MomentViewer";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { CommentsSheet } from "../components/CommentsSheet";
import { RushShareSheet } from "../components/RushShareSheet";
import * as postsApi from "../services/posts";
import * as momentsApi from "../services/moments";
import type { Post, MomentAuthorGroup } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { ImageIcon } from "../components/icons";
import { resolveMediaUrl } from "../utils/media";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";

export function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [momentGroups, setMomentGroups] = useState<MomentAuthorGroup[]>([]);
  const [myMomentCount, setMyMomentCount] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadFeed = useCallback(async (nextCursor?: string | null) => {
    try {
      const res = await postsApi.getFeed(nextCursor);
      setPosts((prev) => (nextCursor ? [...prev, ...res.posts] : res.posts));
      setCursor(res.next_cursor);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  const loadMoments = useCallback(async () => {
   try {
    const [row, mine] = await Promise.all([
      momentsApi.getMomentsRow(),
      momentsApi.getMyMoments(),
    ]);

    const ownGroup: MomentAuthorGroup | null =
      mine.length > 0 && user
        ? {
            author_id: user.id,
            author_username: user.username,
            author_avatar_url: user.avatar_url || "",
            author_avatar_initials: user.avatar_initials || "Y",
            moments: mine,
            all_viewed: mine.every((moment) => moment.viewed),
          }
        : null;

      setMomentGroups(ownGroup ? [ownGroup, ...row] : row);
      setMyMomentCount(mine.length);
    } catch {
    // Moments failing to load shouldn't block the Stream itself.
    }
  }, [user]);

  useEffect(() => {
    setIsLoading(true);
    loadFeed(null).finally(() => setIsLoading(false));
    loadMoments();
  }, [loadFeed, loadMoments]);

  useEffect(() => {
    if (!cursor || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          loadFeed(cursor).finally(() => setIsLoadingMore(false));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [cursor, isLoadingMore, loadFeed]);

  const updatePost = (postId: string, patch: Partial<Post>) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)));
  };

  const handleLikeToggle = async (post: Post) => {
    const wasLiked = post.is_liked;
    updatePost(post.id, {
      is_liked: !wasLiked,
      like_count: post.like_count + (wasLiked ? -1 : 1),
    });
    try {
      if (wasLiked) await postsApi.unlikePost(post.id);
      else await postsApi.likePost(post.id);
    } catch {
      updatePost(post.id, { is_liked: wasLiked, like_count: post.like_count });
      showToast("Couldn't update Love, try again", "error");
    }
  };

  const handleBookmarkToggle = async (post: Post) => {
    const wasBookmarked = post.is_bookmarked;
    updatePost(post.id, { is_bookmarked: !wasBookmarked });
    try {
      if (wasBookmarked) await postsApi.unbookmarkPost(post.id);
      else await postsApi.bookmarkPost(post.id);
    } catch {
      updatePost(post.id, { is_bookmarked: wasBookmarked });
      showToast("Couldn't update Keep, try again", "error");
    }
  };

  const handleShare = (post: Post) => {
    setSharePost(post);
  };

  const handleDeleted = (post: Post) => {
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  };

  const handleAddMomentClick = () => {
    if (myMomentCount > 0) {
      // Jump straight to viewing your own Moments rather than re-uploading.
      const ownGroupIndex = momentGroups.findIndex((g) => g.author_id === user?.id);
      if (ownGroupIndex >= 0) {
        setViewerIndex(ownGroupIndex);
        return;
      }
    }
    navigate("/create/moment");
  };

  return (
    <AppLayout>
      <div className={styles.stories}>
        <StoryAvatar
          name="Your Moment"
          initials={user?.avatar_initials || "Y"}
          avatarUrl={user?.avatar_url || ""}
          isOwn
          onClick={handleAddMomentClick}
          onAddClick={() => navigate("/create/moment")}
        />
        {momentGroups
          .filter((g) => g.author_id !== user?.id)
          .map((group, i) => (
            <StoryAvatar
              key={group.author_id}
              name={group.author_username}
              initials={group.author_avatar_initials}
              avatarUrl={group.author_avatar_url}
              viewed={group.all_viewed}
              onClick={() => setViewerIndex(momentGroups.findIndex((g) => g.author_id === group.author_id))}
            />
          ))}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState
          icon={<ImageIcon />}
          title="Couldn't load your Stream"
          description="Check that the backend is running, then try again."
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<ImageIcon />}
          title="No Flicks yet"
          description="Follow some Spaces or make your first Flick to see it here."
        />
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLikeToggle={handleLikeToggle}
              onBookmarkToggle={handleBookmarkToggle}
              onCommentClick={setActivePost}
              onShareClick={handleShare}
              onDeleted={handleDeleted}
            />
          ))}
          {cursor && (
            <div ref={sentinelRef} className={styles.sentinel}>
              <LoadingSpinner size={22} />
            </div>
          )}
        </div>
      )}

      {activePost && (
        <CommentsSheet
          post={activePost}
          onClose={() => setActivePost(null)}
          onCommentCountChange={(count) => updatePost(activePost.id, { comment_count: count })}
        />
      )}

      {viewerIndex !== null && (
        <MomentViewer groups={momentGroups} startGroupIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
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
    </AppLayout>
  );
}