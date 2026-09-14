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
  onShareSpace?: () => void;
  onContactClick?: () => void;
  onCrewClick?: () => void;
  onCirclesClick?: () => void;
}

export function ProfileHeader({
  user,
  isOwnProfile,
  onEditProfile,
  onFollowToggle,
  onMessage,
  onShareSpace,
  onContactClick,
  onCrewClick,
  onCirclesClick,
}: ProfileHeaderProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <Avatar url={user.avatar_url} initials={user.avatar_initials} size={84} />
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{user.posts_count}</span>
            <span className={styles.statLabel}>Flicks</span>
          </div>
          <button type="button" className={styles.stat} onClick={onCrewClick} disabled={!onCrewClick}>
            <span className={styles.statNum}>{user.followers_count}</span>
            <span className={styles.statLabel}>Crew</span>
          </button>
          <button type="button" className={styles.stat} onClick={onCirclesClick} disabled={!onCirclesClick}>
            <span className={styles.statNum}>{user.following_count}</span>
            <span className={styles.statLabel}>Circles</span>
          </button>
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
          <>
            <Button variant="secondary" onClick={onEditProfile}>
              Edit Space
            </Button>
            <Button variant="secondary" onClick={onShareSpace}>
              Share Space
            </Button>
          </>
        ) : (
          <>
            {user.is_following && user.is_followed_by ? (
              // Mutual — Case 1
              <>
                <Button variant="secondary" onClick={onFollowToggle}>
                  My Circle
                </Button>
                <Button variant="secondary" onClick={onMessage}>
                  Chat
                </Button>
              </>
            ) : user.is_following ? (
              // I follow them, they don't follow me — Case 2
              <Button variant="secondary" onClick={onFollowToggle}>
                Following
              </Button>
            ) : user.is_followed_by ? (
              // They follow me, I don't follow them — Case 4
              <Button variant="primary" onClick={onFollowToggle}>
                Add to My Circle
              </Button>
            ) : (
              // Neither follows the other — Case 3
              <Button variant="primary" onClick={onFollowToggle}>
                Follow
              </Button>
            )}
            {user.show_contact && (
              <Button variant="secondary" onClick={onContactClick}>
                Contact
              </Button>
            )}
            <Button variant="secondary" onClick={onShareSpace}>
              Share Space
            </Button>
          </>
        )}
      </div>
    </div>
  );
}