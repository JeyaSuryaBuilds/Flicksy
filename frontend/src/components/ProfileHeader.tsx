import type { UserPublic } from "../types";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { VerifiedBadge } from "./VerifiedBadge";
import styles from "./ProfileHeader.module.css";

interface ProfileHeaderProps {
  user: UserPublic;
  isOwnProfile: boolean;
  onEditProfile?: () => void;
  onFollowToggle?: () => void;
  onMessage?: () => void;
}

export function ProfileHeader({ user, isOwnProfile, onEditProfile, onFollowToggle, onMessage }: ProfileHeaderProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <Avatar url={user.avatar_url} initials={user.avatar_initials} size={84} />
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{user.posts_count}</span>
            <span className={styles.statLabel}>Flicks</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{user.followers_count}</span>
            <span className={styles.statLabel}>Crew</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{user.following_count}</span>
            <span className={styles.statLabel}>Circles</span>
          </div>
        </div>
      </div>

      <h2 className={styles.name}>
        {user.display_name}
        {user.is_verified && <VerifiedBadge size={15} className={styles.badgeInline} />}
        {user.pronouns && <span className={styles.pronouns}> · {user.pronouns}</span>}
      </h2>
      <div className={styles.username}>@{user.username}</div>
      {user.bio && <p className={styles.bio}>{user.bio}</p>}
      {user.website && (
        <a href={user.website} target="_blank" rel="noreferrer" className={styles.website}>
          {user.website}
        </a>
      )}

      <div className={styles.actions}>
        {isOwnProfile ? (
          <Button variant="secondary" onClick={onEditProfile}>
            Edit Space
          </Button>
        ) : (
          <>
            <Button variant={user.is_following ? "secondary" : "primary"} onClick={onFollowToggle}>
              {user.is_following ? "In your Circles" : "Follow"}
            </Button>
            <Button variant="secondary" onClick={onMessage}>
              Chat
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
