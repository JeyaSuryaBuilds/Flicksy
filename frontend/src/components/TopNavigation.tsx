import { Link } from "react-router-dom";
import { BellIcon, MessageIcon, SparkleIcon } from "./icons";
import styles from "./TopNavigation.module.css";

export function TopNavigation() {
  return (
    <header className={styles.header}>
      <div className={styles.wordmark}>
        flick<span>zy</span>
      </div>
      <div className={styles.icons}>
        <Link to="/flicksy-ai" className={styles.iconBtn} aria-label="flickzy AI">
          <SparkleIcon />
        </Link>
        <Link to="/notifications" className={styles.iconBtn} aria-label="Alerts">
          <BellIcon />
        </Link>
        <Link to="/messages" className={styles.iconBtn} aria-label="Chats">
          <MessageIcon />
        </Link>
      </div>
    </header>
  );
}
