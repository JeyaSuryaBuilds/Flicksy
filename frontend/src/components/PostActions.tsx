import { HeartIcon, CommentIcon, ShareIcon, BookmarkIcon } from "./icons";
import styles from "./PostActions.module.css";

interface PostActionsProps {
  isLiked: boolean;
  isBookmarked: boolean;
  onLikeToggle: () => void;
  onCommentClick: () => void;
  onShareClick: () => void;
  onBookmarkToggle: () => void;
}

export function PostActions({
  isLiked,
  isBookmarked,
  onLikeToggle,
  onCommentClick,
  onShareClick,
  onBookmarkToggle,
}: PostActionsProps) {
  return (
    <div className={styles.row}>
      <div className={styles.left}>
        <button
          className={isLiked ? styles.liked : styles.iconBtn}
          onClick={onLikeToggle}
          aria-pressed={isLiked}
          aria-label={isLiked ? "Remove Love" : "Love this Flick"}
        >
          <HeartIcon filled={isLiked} />
        </button>
        <button className={styles.iconBtn} onClick={onCommentClick} aria-label="Echo this Flick">
          <CommentIcon />
        </button>
        <button className={styles.iconBtn} onClick={onShareClick} aria-label="Pass this Flick on">
          <ShareIcon />
        </button>
      </div>
      <button
        className={isBookmarked ? styles.liked : styles.iconBtn}
        onClick={onBookmarkToggle}
        aria-pressed={isBookmarked}
        aria-label={isBookmarked ? "Remove from Keeps" : "Keep this Flick"}
      >
        <BookmarkIcon filled={isBookmarked} />
      </button>
    </div>
  );
}
