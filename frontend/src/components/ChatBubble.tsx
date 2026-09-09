import type { Message } from "../types";
import styles from "./ChatBubble.module.css";

export function ChatBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={isOwn ? styles.rowOwn : styles.row}>
      <div className={isOwn ? styles.bubbleOwn : styles.bubble}>
        <p className={styles.text}>{message.body}</p>
      </div>
      <span className={styles.time}>
        {time}
        {isOwn && message.read_at ? " · Read" : ""}
      </span>
    </div>
  );
}
