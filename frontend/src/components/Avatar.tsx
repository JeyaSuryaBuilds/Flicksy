import { resolveMediaUrl } from "../utils/media";
import styles from "./Avatar.module.css";

interface AvatarProps {
  url?: string;
  initials?: string;
  size?: number;
  ring?: boolean;
}

export function Avatar({
  url,
  initials: _initials,
  size = 40,
  ring = false,
}: AvatarProps) {
  const style = {
    width: size,
    height: size,
  };

  const resolvedUrl = resolveMediaUrl(url);

  return (
    <div
      className={[styles.avatar, ring ? styles.ring : ""].join(" ")}
      style={style}
      aria-label={resolvedUrl ? "Profile photo" : "Default profile avatar"}
    >
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt=""
          className={styles.img}
          draggable={false}
        />
      ) : (
        <span
          className={styles.defaultAvatar}
          aria-hidden="true"
        >
          <span className={styles.head} />
          <span className={styles.body} />
        </span>
      )}
    </div>
  );
}