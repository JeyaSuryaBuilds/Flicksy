import { Link } from "react-router-dom";
import type { Conversation } from "../types";
import { Avatar } from "./Avatar";
import { timeAgo } from "../utils/time";
import styles from "./MessageItem.module.css";

export function MessageItem({ conversation }: { conversation: Conversation }) {
  return (
    <Link to={`/messages/${conversation.id}`} className={styles.row}>
      <Avatar url={conversation.other_user.avatar_url} initials={conversation.other_user.avatar_initials} size={50} />
      <div className={styles.body}>
        <div className={styles.topLine}>
          <span className={styles.name}>{conversation.other_user.username}</span>
          {conversation.last_message && (
            <span className={styles.time}>{timeAgo(conversation.last_message.created_at)}</span>
          )}
        </div>
        <p className={conversation.unread_count > 0 ? styles.previewUnread : styles.preview}>
          {conversation.last_message?.body || "Say hello 👋"}
        </p>
      </div>
      {conversation.unread_count > 0 && <span className={styles.badge}>{conversation.unread_count}</span>}
    </Link>
  );
}
