import type { Comment } from "../types";
import { Avatar } from "./Avatar";
import { HeartIcon } from "./icons";
import { timeAgo } from "../utils/time";
import styles from "./CommentItem.module.css";

interface CommentItemProps {
  comment: Comment;
  onLikeToggle: (comment: Comment) => void;
}

export function CommentItem({ comment, onLikeToggle }: CommentItemProps) {
  return (
    <div className={styles.row}>
      <Avatar url={comment.author.avatar_url} initials={comment.author.avatar_initials} size={32} />
      <div className={styles.body}>
        <p className={styles.text}>
          <b>{comment.author.username}</b> {comment.body}
        </p>
        <div className={styles.meta}>
          <span>{timeAgo(comment.created_at)}</span>
          {comment.like_count > 0 && <span>{comment.like_count} likes</span>}
        </div>
      </div>
      <button
        className={comment.is_liked ? styles.likedBtn : styles.likeBtn}
        onClick={() => onLikeToggle(comment)}
        aria-label={comment.is_liked ? "Unlike comment" : "Like comment"}
      >
        <HeartIcon size={14} filled={comment.is_liked} />
      </button>
    </div>
  );
}
