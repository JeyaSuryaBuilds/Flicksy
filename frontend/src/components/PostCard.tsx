import { useState } from "react";
import { Link } from "react-router-dom";
import type { Post } from "../types";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { PostActions } from "./PostActions";
import { MoreIcon, PlayIcon } from "./icons";
import { timeAgo } from "../utils/time";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./Toast";
import { deletePost } from "../services/posts";
import { reportContent } from "../services/reports";
import styles from "./PostCard.module.css";

interface PostCardProps {
  post: Post;
  onLikeToggle: (post: Post) => void;
  onBookmarkToggle: (post: Post) => void;
  onCommentClick: (post: Post) => void;
  onShareClick: (post: Post) => void;
  onDeleted?: (post: Post) => void;
}

export function PostCard({ post, onLikeToggle, onBookmarkToggle, onCommentClick, onShareClick, onDeleted }: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();
  const isOwn = user?.id === post.author.id;

  const handleDelete = async () => {
    setMenuOpen(false);
    try {
      await deletePost(post.id);
      showToast("Flick deleted", "success");
      onDeleted?.(post);
    } catch {
      showToast("Couldn't delete this Flick", "error");
    }
  };

  const handleReport = async () => {
    setMenuOpen(false);
    try {
      await reportContent("post", post.id, "inappropriate_content");
      showToast("Thanks — we've received your report", "success");
    } catch {
      showToast("Couldn't submit report", "error");
    }
  };

  return (
    <article className={styles.post}>
      <div className={styles.head}>
        <Link to={`/users/${post.author.id}`} className={styles.userLink}>
          <Avatar url={post.author.avatar_url} initials={post.author.avatar_initials} size={38} />
          <div>
            <div className={styles.uname}>
              {post.author.username}
              {post.author.is_verified && <VerifiedBadge size={12} />}
            </div>
            {post.location && <div className={styles.uloc}>{post.location}</div>}
          </div>
        </Link>
        <div className={styles.menuWrap}>
          <button className={styles.moreBtn} aria-label="More options" onClick={() => setMenuOpen((v) => !v)}>
            <MoreIcon />
          </button>
          {menuOpen && (
            <>
              <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} />
              <div className={styles.menu} role="menu">
                {isOwn ? (
                  <button className={styles.menuItemDanger} onClick={handleDelete} role="menuitem">
                    Delete Flick
                  </button>
                ) : (
                  <button className={styles.menuItem} onClick={handleReport} role="menuitem">
                    Report Flick
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.media}>
        {post.media_type === "video" && (
          <span className={styles.mediaTag}>
            <PlayIcon />
            {post.media_tag}
          </span>
        )}
      </div>

      <PostActions
        isLiked={post.is_liked}
        isBookmarked={post.is_bookmarked}
        onLikeToggle={() => onLikeToggle(post)}
        onCommentClick={() => onCommentClick(post)}
        onShareClick={() => onShareClick(post)}
        onBookmarkToggle={() => onBookmarkToggle(post)}
      />

      <div className={styles.likes}>{post.like_count.toLocaleString()} Loves</div>
      {post.caption && (
        <p className={styles.caption}>
          <b>{post.author.username}</b> {post.caption}
        </p>
      )}
      {post.comment_count > 0 && (
        <button className={styles.commentsLink} onClick={() => onCommentClick(post)}>
          View all {post.comment_count} Echoes
        </button>
      )}
      <div className={styles.timestamp}>{timeAgo(post.created_at)}</div>
    </article>
  );
}
