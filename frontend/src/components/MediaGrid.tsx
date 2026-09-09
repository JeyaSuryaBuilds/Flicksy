import type { Post } from "../types";
import { PlayIcon } from "./icons";
import styles from "./MediaGrid.module.css";

interface MediaGridProps {
  posts: Post[];
  onSelect?: (post: Post) => void;
}

export function MediaGrid({ posts, onSelect }: MediaGridProps) {
  return (
    <div className={styles.grid}>
      {posts.map((post) => (
        <button key={post.id} className={styles.tile} onClick={() => onSelect?.(post)}>
          {post.media_type === "video" && (
            <span className={styles.videoTag}>
              <PlayIcon size={10} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
