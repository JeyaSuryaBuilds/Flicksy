import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { ProfileHeader } from "../components/ProfileHeader";
import { MediaGrid } from "../components/MediaGrid";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Avatar } from "../components/Avatar";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { SpaceThemeWrapper } from "../components/SpaceThemeWrapper";
import { SpaceThemeEditor } from "../components/SpaceThemeEditor";
import { ImageIcon } from "../components/icons";
import { useAuth } from "../hooks/useAuth";
import { updateUser, checkFlickTagAvailable } from "../services/users";
import { getFeed } from "../services/posts";
import { uploadMedia } from "../services/media";
import * as spaceThemeApi from "../services/spaceTheme";
import type { SpaceTheme } from "../services/spaceTheme";
import { useToast } from "../components/Toast";
import type { Post } from "../types";
import styles from "./Profile.module.css";

const TABS = ["Flicks", "Tagged", "Keeps"] as const;

export function Profile() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Flicks");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [theme, setTheme] = useState<SpaceTheme | null>(null);

  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [website, setWebsite] = useState(user?.website || "");
  const [pronouns, setPronouns] = useState(user?.pronouns || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [flickTag, setFlickTag] = useState(user?.username || "");
  const [flickTagStatus, setFlickTagStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { showToast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getFeed()
      .then((res) => setPosts(res.posts.filter((p) => p.author.id === user?.id)))
      .finally(() => setIsLoading(false));
    spaceThemeApi.getMySpaceTheme().then(setTheme).catch(() => {});
  }, [user?.id]);

  // Live FlickTag availability check while editing, debounced
  useEffect(() => {
    if (!isEditOpen || !user) return;
    const trimmed = flickTag.trim().toLowerCase();
    if (trimmed === user.username || trimmed.length < 3) {
      setFlickTagStatus("idle");
      return;
    }
    setFlickTagStatus("checking");
    const handle = setTimeout(() => {
      checkFlickTagAvailable(trimmed)
        .then((res) => setFlickTagStatus(res.available ? "available" : "taken"))
        .catch(() => setFlickTagStatus("idle"));
    }, 400);
    return () => clearTimeout(handle);
  }, [flickTag, isEditOpen, user]);

  if (!user) return null;

  const keptPosts = posts.filter((p) => p.is_bookmarked);
  const visiblePosts = tab === "Keeps" ? keptPosts : tab === "Flicks" ? posts : [];

  const openEdit = () => {
    setDisplayName(user.display_name);
    setBio(user.bio);
    setWebsite(user.website);
    setPronouns(user.pronouns);
    setAvatarUrl(user.avatar_url);
    setFlickTag(user.username);
    setFlickTagStatus("idle");
    setIsEditOpen(true);
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const uploaded = await uploadMedia(file, "image");
      setAvatarUrl(uploaded.url);
    } catch {
      showToast("Couldn't upload avatar", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (flickTagStatus === "taken") {
      showToast("That FlickTag is already taken", "error");
      return;
    }
    setIsSaving(true);
    try {
      await updateUser(user.id, {
        display_name: displayName,
        bio,
        website,
        pronouns,
        avatar_url: avatarUrl,
        username: flickTag.trim().toLowerCase(),
      });
      await refreshUser();
      showToast("Space updated", "success");
      setIsEditOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Couldn't update your Space", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <SpaceThemeWrapper theme={theme}>
        <div className={styles.topBar}>
          <button className={styles.themeLink} onClick={() => setIsThemeOpen(true)}>
            Space Theme
          </button>
          <Link to="/settings" className={styles.settingsLink} aria-label="Settings">
            Settings
          </Link>
        </div>

        <ProfileHeader user={user} isOwnProfile onEditProfile={openEdit} />

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button key={t} className={t === tab ? styles.tabActive : styles.tab} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : visiblePosts.length === 0 ? (
          <EmptyState
            icon={<ImageIcon />}
            title={tab === "Keeps" ? "Nothing Kept yet" : tab === "Tagged" ? "No tagged Flicks" : "No Flicks yet"}
            description={tab === "Flicks" ? "Share your first Flick to see it here." : undefined}
          />
        ) : (
          <MediaGrid posts={visiblePosts} />
        )}
      </SpaceThemeWrapper>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Space">
        <div className={styles.editForm}>
          <div className={styles.avatarEditRow}>
            <Avatar url={avatarUrl} initials={user.avatar_initials} size={64} />
            <button
              type="button"
              className={styles.avatarChangeBtn}
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? "Uploading…" : "Change Avatar"}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div>
            <Input
              label="FlickTag"
              value={flickTag}
              onChange={(e) => setFlickTag(e.target.value.replace(/\s/g, ""))}
            />
            {flickTagStatus === "checking" && <p className={styles.tagHintMuted}>Checking availability…</p>}
            {flickTagStatus === "available" && <p className={styles.tagHintOk}>@{flickTag.toLowerCase()} is available</p>}
            {flickTagStatus === "taken" && <p className={styles.tagHintError}>That FlickTag is already taken</p>}
          </div>

          <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Input label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
          <Input label="Website" placeholder="yourlink.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <Input label="Pronouns" placeholder="e.g. she/her" value={pronouns} onChange={(e) => setPronouns(e.target.value)} />
          <Button onClick={handleSaveProfile} isLoading={isSaving} disabled={flickTagStatus === "taken"}>
            Save Changes
          </Button>
        </div>
      </Modal>

      <SpaceThemeEditor isOpen={isThemeOpen} onClose={() => setIsThemeOpen(false)} onSaved={setTheme} />
    </AppLayout>
  );
}
