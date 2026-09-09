import { Avatar } from "./Avatar";
import styles from "./StoryAvatar.module.css";

interface StoryAvatarProps {
  name: string;
  initials: string;
  avatarUrl?: string;
  viewed?: boolean;
  isOwn?: boolean;
  onClick?: () => void;
  onAddClick?: () => void;
}

export function StoryAvatar({
  name,
  initials,
  avatarUrl,
  viewed = false,
  isOwn = false,
  onClick,
  onAddClick,
}: StoryAvatarProps) {
  return (
    <button className={styles.story} onClick={onClick} type="button">
      <div className={[styles.ringWrap, viewed ? styles.seen : styles.unseen].join(" ")}>
        <Avatar url={avatarUrl} initials={initials} size={52} />

        {isOwn && (
          <span
            className={styles.addBadge}
            role="button"
            tabIndex={0}
            aria-label="Create a new Moment"
            onClick={(event) => {
              event.stopPropagation();
              onAddClick?.();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onAddClick?.();
              }
            }}
          >
            <svg
              viewBox="0 0 24 24"
              stroke="#15130f"
              strokeWidth="3"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        )}
      </div>

      <span className={styles.name}>{name}</span>
    </button>
  );
}