import type { Post } from "../types";
import { PlayIcon } from "./icons";
import { resolveMediaUrl } from "../utils/media";
import styles from "./MediaGrid.module.css";

interface MediaGridProps {
  posts: Post[];
  onSelect?: (post: Post) => void;
}

export function MediaGrid({ posts, onSelect }: MediaGridProps) {
  return (
    <div className={styles.grid}>
      {posts.map((post) => {
        const mediaUrl = resolveMediaUrl(post.media?.[0]?.url);
        return (
          <button key={post.id} className={styles.tile} onClick={() => onSelect?.(post)}>
            {mediaUrl ? (
              post.media_type === "video" ? (
                <video className={styles.thumb} src={mediaUrl} muted playsInline preload="metadata" />
              ) : (
                <img className={styles.thumb} src={mediaUrl} alt="" draggable={false} />
              )
            ) : null}
            {post.media_type === "video" && (
              <span className={styles.videoTag}>
                <PlayIcon size={10} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}