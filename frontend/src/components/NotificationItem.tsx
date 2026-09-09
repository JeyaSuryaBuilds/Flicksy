import type { Notification } from "../types";
import { Avatar } from "./Avatar";
import { HeartIcon, CommentIcon, UserIcon, MessageIcon } from "./icons";
import { timeAgo } from "../utils/time";
import styles from "./NotificationItem.module.css";

const typeCopy: Record<Notification["type"], string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
  follow_request: "requested to follow you",
  mention: "mentioned you",
  message: "sent you a message",
};

const typeIcon: Record<Notification["type"], JSX.Element> = {
  like: <HeartIcon size={14} filled />,
  comment: <CommentIcon size={14} />,
  follow: <UserIcon size={14} />,
  follow_request: <UserIcon size={14} />,
  mention: <CommentIcon size={14} />,
  message: <MessageIcon size={14} />,
};

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  return (
    <button className={styles.row} onClick={onClick}>
      <div className={styles.avatarWrap}>
        <Avatar url={notification.actor.avatar_url} initials={notification.actor.avatar_initials} size={44} />
        <span className={styles.badge}>{typeIcon[notification.type]}</span>
      </div>
      <div className={styles.body}>
        <p className={styles.text}>
          <b>{notification.actor.username}</b> {typeCopy[notification.type]}
        </p>
        <span className={styles.time}>{timeAgo(notification.created_at)}</span>
      </div>
      {!notification.is_read && <span className={styles.dot} aria-hidden="true" />}
    </button>
  );
}
