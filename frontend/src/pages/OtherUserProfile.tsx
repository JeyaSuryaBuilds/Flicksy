import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { ProfileHeader } from "../components/ProfileHeader";
import { MediaGrid } from "../components/MediaGrid";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { SpaceThemeWrapper } from "../components/SpaceThemeWrapper";
import { ImageIcon } from "../components/icons";
import * as usersApi from "../services/users";
import { getFeed } from "../services/posts";
import { startConversation } from "../services/messages";
import * as spaceThemeApi from "../services/spaceTheme";
import type { SpaceTheme } from "../services/spaceTheme";
import { useToast } from "../components/Toast";
import type { Post, UserPublic } from "../types";
import profileStyles from "./Profile.module.css";

export function OtherUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [profileUser, setProfileUser] = useState<UserPublic | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [theme, setTheme] = useState<SpaceTheme | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    setTheme(null);
    Promise.all([usersApi.getUser(userId), getFeed()])
      .then(([u, feed]) => {
        setProfileUser(u);
        setPosts(feed.posts.filter((p) => p.author.id === userId));
      })
      .catch(() => showToast("Couldn't load this Space", "error"))
      .finally(() => setIsLoading(false));
    // Real backend-persisted theme — this is what the owner actually chose, not a local setting.
    spaceThemeApi.getUserSpaceTheme(userId).then(setTheme).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!profileUser) return;
    const wasFollowing = profileUser.is_following;
    setProfileUser({
      ...profileUser,
      is_following: !wasFollowing,
      followers_count: profileUser.followers_count + (wasFollowing ? -1 : 1),
    });
    try {
      if (wasFollowing) await usersApi.unfollowUser(profileUser.id);
      else await usersApi.followUser(profileUser.id);
    } catch {
      setProfileUser(profileUser);
      showToast("Couldn't update follow status", "error");
    }
  };

  const handleMessage = async () => {
    if (!profileUser) return;
    try {
      const conversation = await startConversation(profileUser.id);
      navigate(`/messages/${conversation.id}`);
    } catch {
      showToast("Couldn't start a Chat", "error");
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (!profileUser) {
    return (
      <AppLayout>
        <EmptyState icon={<ImageIcon />} title="Space not found" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SpaceThemeWrapper theme={theme}>
        <ProfileHeader
          user={profileUser}
          isOwnProfile={false}
          onFollowToggle={handleFollowToggle}
          onMessage={handleMessage}
        />
        <div className={profileStyles.tabs}>
          <span className={profileStyles.tabActive}>Flicks</span>
        </div>
        {posts.length === 0 ? (
          <EmptyState icon={<ImageIcon />} title="No Flicks yet" />
        ) : (
          <MediaGrid posts={posts} />
        )}
      </SpaceThemeWrapper>
    </AppLayout>
  );
}
