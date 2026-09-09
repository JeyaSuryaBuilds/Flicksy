import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { HeartIcon, CommentIcon, ShareIcon, BookmarkIcon, RushIcon, PlayIcon } from "../components/icons";
import * as rushApi from "../services/rush";
import * as postsApi from "../services/posts";
import { CommentsSheet } from "../components/CommentsSheet";
import { useToast } from "../components/Toast";
import type { Post } from "../types";
import styles from "./Rush.module.css";

export function Rush() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [muted, setMuted] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    rushApi
      .getRushFeed()
      .then((res) => setPosts(res.posts))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, []);

  const updatePost = (postId: string, patch: Partial<Post>) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)));
  };

  const handleLike = async (post: Post) => {
    const wasLiked = post.is_liked;
    updatePost(post.id, { is_liked: !wasLiked, like_count: post.like_count + (wasLiked ? -1 : 1) });
    try {
      if (wasLiked) await postsApi.unlikePost(post.id);
      else await postsApi.likePost(post.id);
    } catch {
      updatePost(post.id, { is_liked: wasLiked, like_count: post.like_count });
    }
  };

  const handleKeep = async (post: Post) => {
    const wasKept = post.is_bookmarked;
    updatePost(post.id, { is_bookmarked: !wasKept });
    try {
      if (wasKept) await postsApi.unbookmarkPost(post.id);
      else await postsApi.bookmarkPost(post.id);
    } catch {
      updatePost(post.id, { is_bookmarked: wasKept });
    }
  };

  const handleSendOn = (post: Post) => {
    navigator.clipboard?.writeText(`${window.location.origin}/r/${post.id}`);
    showToast("Link copied — ready to Send On", "success");
  };

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (error || posts.length === 0) {
    return (
      <AppLayout>
        <EmptyState
          icon={<RushIcon />}
          title={error ? "Couldn't load Rush" : "No Rush yet"}
          description={error ? "Check that the backend is running." : "Be the first to post a Rush."}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={styles.page}>
        <div className={styles.feed}>
          {posts.map((post) => (
            <div key={post.id} className={styles.slide}>
              <div
                 className={styles.mediaArea}
                 onClick={() => {
                  if (post.media_type === "video") {
                    setMuted((m) => !m);
                  }
                }}
              >
                {post.media?.[0]?.url ? (
                  post.media_type === "video" ? (
                    <video
                     className={styles.rushMedia}
                     src={post.media[0].url}
                     autoPlay
                     loop
                     muted={muted}
                     playsInline
                     controls={false}
                    />
                  ) : (
                    <img
                     className={styles.rushMedia}
                     src={post.media[0].url}
                     alt={post.caption || "Rush"}
                     draggable={false}
                    />
                   )
                  ) : (
                    <div className={styles.placeholderMedia} />
                  )}

                  {post.media_type === "video" && (
                    <div className={styles.muteHint}>
                     {muted ? "Tap to unmute" : "Tap to mute"}
                    </div>
                  )}
                 </div>

              <div className={styles.topOverlay}>
                <span className={styles.rushLabel}>Rush</span>
              </div>

              <div className={styles.bottomOverlay}>
                <Link to={`/users/${post.author.id}`} className={styles.userRow}>
                  <Avatar url={post.author.avatar_url} initials={post.author.avatar_initials} size={38} />
                  <span className={styles.username}>
                    {post.author.username}
                    {post.author.is_verified && <VerifiedBadge size={13} />}
                  </span>
                </Link>
                {post.caption && <p className={styles.caption}>{post.caption}</p>}
              </div>

              <div className={styles.actionsRail}>
                <button className={styles.actionBtn} onClick={() => handleLike(post)} aria-label="Love">
                  <HeartIcon size={26} filled={post.is_liked} />
                  <span>{post.like_count}</span>
                </button>
                <button className={styles.actionBtn} onClick={() => setActivePost(post)} aria-label="Echo">
                  <CommentIcon size={24} />
                  <span>{post.comment_count}</span>
                </button>
                <button className={styles.actionBtn} onClick={() => handleSendOn(post)} aria-label="Send On">
                  <ShareIcon size={24} />
                  <span>Send</span>
                </button>
                <button className={styles.actionBtn} onClick={() => handleKeep(post)} aria-label="Keep">
                  <BookmarkIcon size={24} filled={post.is_bookmarked} />
                  <span>Keep</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {activePost && (
          <CommentsSheet
            post={activePost}
            onClose={() => setActivePost(null)}
            onCommentCountChange={(count) => updatePost(activePost.id, { comment_count: count })}
          />
        )}
      </div>
    </AppLayout>
  );
}
