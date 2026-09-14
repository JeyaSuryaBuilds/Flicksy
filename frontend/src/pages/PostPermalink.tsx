import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { PostCard } from "../components/PostCard";
import { CommentsSheet } from "../components/CommentsSheet";
import { RushShareSheet } from "../components/RushShareSheet";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { ImageIcon } from "../components/icons";
import { getPost, likePost, unlikePost, bookmarkPost, unbookmarkPost } from "../services/posts";
import { resolveMediaUrl } from "../utils/media";
import { useToast } from "../components/Toast";
import type { Post } from "../types";
import styles from "./PostPermalink.module.css";

export function PostPermalink() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"not_found" | "private" | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!postId) return;
    setIsLoading(true);
    setError(null);
    getPost(postId)
      .then(setPost)
      .catch((err) => {
        setError(err?.response?.status === 403 ? "private" : "not_found");
      })
      .finally(() => setIsLoading(false));
  }, [postId]);

  const patch = (patchValue: Partial<Post>) => {
    setPost((prev) => (prev ? { ...prev, ...patchValue } : prev));
  };

  const handleLikeToggle = async (target: Post) => {
    const wasLiked = target.is_liked;
    patch({ is_liked: !wasLiked, like_count: target.like_count + (wasLiked ? -1 : 1) });
    try {
      if (wasLiked) await unlikePost(target.id);
      else await likePost(target.id);
    } catch {
      patch({ is_liked: wasLiked, like_count: target.like_count });
    }
  };

  const handleBookmarkToggle = async (target: Post) => {
    const wasBookmarked = target.is_bookmarked;
    patch({ is_bookmarked: !wasBookmarked });
    try {
      if (wasBookmarked) await unbookmarkPost(target.id);
      else await bookmarkPost(target.id);
    } catch {
      patch({ is_bookmarked: wasBookmarked });
    }
  };

  const handleDeleted = () => {
    showToast("Flick deleted", "success");
    navigate("/home", { replace: true });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (error || !post) {
    return (
      <AppLayout>
        <EmptyState
          icon={<ImageIcon />}
          title={error === "private" ? "This Space is private" : "This Flick isn't available"}
          description={
            error === "private"
              ? "You need to be in this person's Circle to see it."
              : "It may have been deleted or the link is incorrect."
          }
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={styles.wrap}>
        <PostCard
          post={post}
          onLikeToggle={handleLikeToggle}
          onBookmarkToggle={handleBookmarkToggle}
          onCommentClick={() => setCommentOpen(true)}
          onShareClick={() => setShareOpen(true)}
          onDeleted={handleDeleted}
          onUpdated={(updated) => setPost(updated)}
        />
      </div>

      {commentOpen && (
        <CommentsSheet
          post={post}
          onClose={() => setCommentOpen(false)}
          onCommentCountChange={(count) => patch({ comment_count: count })}
        />
      )}

      {shareOpen && (
        <RushShareSheet
          isOpen={true}
          onClose={() => setShareOpen(false)}
          postId={post.id}
          mediaUrl={resolveMediaUrl(post.media?.[0]?.url)}
          mediaType={post.media_type}
          caption={post.caption}
          contentType={post.is_rush ? "rush" : "post"}
        />
      )}
    </AppLayout>
  );
}