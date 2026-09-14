import { Link } from "react-router-dom";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { CloseIcon } from "./icons";
import { LoadingSpinner } from "./LoadingSpinner";
import { EmptyState } from "./EmptyState";
import type { UserPublic } from "../types";
import styles from "./UserListModal.module.css";

interface UserListModalProps {
  title: string;
  users: UserPublic[];
  isLoading: boolean;
  emptyMessage: string;
  onClose: () => void;
  onUserClick?: () => void;
}

export function UserListModal({ title, users, isLoading, emptyMessage, onClose, onUserClick }: UserListModalProps) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className={styles.list}>
          {isLoading ? (
            <LoadingSpinner size={26} />
          ) : users.length === 0 ? (
            <EmptyState title={emptyMessage} />
          ) : (
            users.map((u) => (
              <Link key={u.id} to={`/users/${u.id}`} className={styles.row} onClick={onUserClick}>
                <Avatar url={u.avatar_url} initials={u.avatar_initials} size={46} />
                <div className={styles.info}>
                  <span className={styles.name}>
                    {u.username}
                    {u.is_verified && <VerifiedBadge size={12} />}
                  </span>
                  <span className={styles.sub}>{u.display_name}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}