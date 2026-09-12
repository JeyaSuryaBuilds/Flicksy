import { resolveMediaUrl } from "../utils/media";
import styles from "./Avatar.module.css";

interface AvatarProps {
  url?: string;
  initials: string;
  size?: number;
  ring?: boolean;
}

export function Avatar({ url, initials, size = 40, ring = false }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.34) };
  const resolvedUrl = resolveMediaUrl(url);
  return (
    <div className={[styles.avatar, ring ? styles.ring : ""].join(" ")} style={style}>
      {resolvedUrl ? (
        <img src={resolvedUrl} alt="" className={styles.img} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}