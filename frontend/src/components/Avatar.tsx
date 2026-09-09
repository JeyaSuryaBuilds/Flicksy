import styles from "./Avatar.module.css";

interface AvatarProps {
  url?: string;
  initials: string;
  size?: number;
  ring?: boolean;
}

export function Avatar({ url, initials, size = 40, ring = false }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.34) };
  return (
    <div className={[styles.avatar, ring ? styles.ring : ""].join(" ")} style={style}>
      {url ? (
        <img src={url} alt="" className={styles.img} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}
