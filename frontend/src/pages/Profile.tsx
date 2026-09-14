import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { ProfileHeader } from "../components/ProfileHeader";
import { MediaGrid } from "../components/MediaGrid";
import { PostCard } from "../components/PostCard";
import { CommentsSheet } from "../components/CommentsSheet";
import { RushShareSheet } from "../components/RushShareSheet";
import { UserListModal } from "../components/UserListModal";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { Toggle } from "../components/Toggle";
import { Button } from "../components/Button";
import { Avatar } from "../components/Avatar";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { SpaceThemeWrapper } from "../components/SpaceThemeWrapper";
import { SpaceThemeEditor } from "../components/SpaceThemeEditor";
import { CloseIcon, ImageIcon } from "../components/icons";
import { useAuth } from "../hooks/useAuth";
import {
  updateUser,
  checkFlickTagAvailable,
  getUserPosts,
  getFollowers,
  getFollowing,
} from "../services/users";
import {
  likePost,
  unlikePost,
  bookmarkPost,
  unbookmarkPost,
} from "../services/posts";
import { resolveMediaUrl } from "../utils/media";
import * as spaceThemeApi from "../services/spaceTheme";
import type { SpaceTheme } from "../services/spaceTheme";
import { useToast } from "../components/Toast";
import type { Post, UserPublic } from "../types";
import styles from "./Profile.module.css";

const TABS = ["Flicks", "Tagged", "Keeps"] as const;

/*
 * Profile photos are resized before being saved.
 *
 * This keeps the image small enough to store safely as profile data
 * instead of depending on Render's temporary local filesystem.
 */
const MAX_AVATAR_SIZE = 512;

function compressAvatarImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Unable to read image"));
    };

    reader.onload = () => {
      const source = String(reader.result || "");

      const image = new Image();

      image.onerror = () => {
        reject(new Error("Unable to process image"));
      };

      image.onload = () => {
        const canvas = document.createElement("canvas");

        const scale = Math.min(
          MAX_AVATAR_SIZE / image.width,
          MAX_AVATAR_SIZE / image.height,
          1
        );

        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Unable to create image canvas"));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        /*
         * JPEG compression keeps the database payload considerably
         * smaller than the original camera/gallery image.
         */
        const compressed = canvas.toDataURL("image/jpeg", 0.82);

        resolve(compressed);
      };

      image.src = source;
    };

    reader.readAsDataURL(file);
  });
}

export function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<(typeof TABS)[number]>("Flicks");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  const [theme, setTheme] = useState<SpaceTheme | null>(null);

  const [displayName, setDisplayName] = useState(
    user?.display_name || ""
  );

  const [bio, setBio] = useState(user?.bio || "");
  const [website, setWebsite] = useState(user?.website || "");
  const [pronouns, setPronouns] = useState(user?.pronouns || "");

  /*
   * avatarUrl contains the currently saved profile photo URL/data.
   *
   * If there is no photo, this remains an empty string.
   * The Avatar component will then show Flickzy's original
   * neutral default avatar instead of a name initial.
   */
  const [avatarUrl, setAvatarUrl] = useState(
    user?.avatar_url || ""
  );

  const [contactInfo, setContactInfo] = useState(
    user?.contact_info || ""
  );

  const [showContact, setShowContact] = useState(
    user?.show_contact || false
  );

  const [flickTag, setFlickTag] = useState(
    user?.username || ""
  );

  const [flickTagStatus, setFlickTagStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Open Flicks: post detail modal
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);

  // Crew / Circles
  const [crewOpen, setCrewOpen] = useState(false);
  const [circlesOpen, setCirclesOpen] = useState(false);

  const [crewUsers, setCrewUsers] = useState<UserPublic[]>([]);
  const [circleUsers, setCircleUsers] = useState<UserPublic[]>([]);

  const [isCrewLoading, setIsCrewLoading] = useState(false);
  const [isCirclesLoading, setIsCirclesLoading] = useState(false);

  const { showToast } = useToast();

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    setIsLoading(true);

    getUserPosts(user.id)
      .then(setPosts)
      .catch(() => showToast("Couldn't load your Flicks", "error"))
      .finally(() => setIsLoading(false));

    spaceThemeApi
      .getMySpaceTheme()
      .then(setTheme)
      .catch(() => {});

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /*
   * Keep the edit form synchronized with the currently authenticated
   * user's profile photo.
   */
  useEffect(() => {
    if (!user) return;

    setAvatarUrl(user.avatar_url || "");
    setDisplayName(user.display_name || "");
    setBio(user.bio || "");
    setWebsite(user.website || "");
    setPronouns(user.pronouns || "");
    setContactInfo(user.contact_info || "");
    setShowContact(user.show_contact || false);
    setFlickTag(user.username || "");
  }, [user]);

  // Live FlickTag availability check while editing, debounced
  useEffect(() => {
    if (!isEditOpen || !user) return;

    const trimmed = flickTag.trim().toLowerCase();

    if (
      trimmed === user.username ||
      trimmed.length < 3
    ) {
      setFlickTagStatus("idle");
      return;
    }

    setFlickTagStatus("checking");

    const handle = setTimeout(() => {
      checkFlickTagAvailable(trimmed)
        .then((res) =>
          setFlickTagStatus(
            res.available ? "available" : "taken"
          )
        )
        .catch(() => setFlickTagStatus("idle"));
    }, 400);

    return () => clearTimeout(handle);
  }, [flickTag, isEditOpen, user]);

  if (!user) return null;

  const keptPosts = posts.filter(
    (p) => p.is_bookmarked
  );

  const visiblePosts =
    tab === "Keeps"
      ? keptPosts
      : tab === "Flicks"
        ? posts
        : [];

  const openEdit = () => {
    setDisplayName(user.display_name);
    setBio(user.bio);
    setWebsite(user.website);
    setPronouns(user.pronouns);

    /*
     * Always start with the photo that is actually stored
     * on the authenticated user.
     */
    setAvatarUrl(user.avatar_url || "");

    setContactInfo(user.contact_info);
    setShowContact(user.show_contact);
    setFlickTag(user.username);
    setFlickTagStatus("idle");

    setIsEditOpen(true);
  };

  /*
   * Select and compress a new profile photo.
   *
   * The image is NOT stored inside the APK.
   * It becomes part of avatar_url and is persisted through
   * updateUser() when Save Changes is pressed.
   */
  const handleAvatarChange = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    /*
     * Reset the input so the user can select the same photo again
     * later if needed.
     */
    e.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file", "error");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const compressedAvatar =
        await compressAvatarImage(file);

      setAvatarUrl(compressedAvatar);

      showToast(
        "Profile photo ready. Save Changes to keep it.",
        "success"
      );
    } catch {
      showToast(
        "Couldn't process profile photo",
        "error"
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (flickTagStatus === "taken") {
      showToast(
        "That FlickTag is already taken",
        "error"
      );
      return;
    }

    setIsSaving(true);

    try {
      /*
       * avatar_url is deliberately included here.
       *
       * The backend saves this value with the user record.
       * Therefore rebuilding the APK or redeploying the frontend
       * does not remove the profile photo.
       */
      await updateUser(user.id, {
        display_name: displayName,
        bio,
        website,
        pronouns,
        avatar_url: avatarUrl,
        username: flickTag.trim().toLowerCase(),
        contact_info: contactInfo,
        show_contact: showContact,
      });

      /*
       * Reload the authenticated user from the backend so the
       * entire app immediately receives the persisted photo.
       */
      await refreshUser();

      showToast(
        "Space updated",
        "success"
      );

      setIsEditOpen(false);
    } catch (err: any) {
      showToast(
        err?.response?.data?.detail ||
          "Couldn't update your Space",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const patchPost = (
    postId: string,
    patch: Partial<Post>
  ) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, ...patch }
          : p
      )
    );

    setSelectedPost((prev) =>
      prev && prev.id === postId
        ? { ...prev, ...patch }
        : prev
    );
  };

  const handleLikeToggle = async (
    post: Post
  ) => {
    const wasLiked = post.is_liked;

    patchPost(post.id, {
      is_liked: !wasLiked,
      like_count:
        post.like_count +
        (wasLiked ? -1 : 1),
    });

    try {
      if (wasLiked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }
    } catch {
      patchPost(post.id, {
        is_liked: wasLiked,
        like_count: post.like_count,
      });
    }
  };

  const handleBookmarkToggle = async (
    post: Post
  ) => {
    const wasBookmarked =
      post.is_bookmarked;

    patchPost(post.id, {
      is_bookmarked: !wasBookmarked,
    });

    try {
      if (wasBookmarked) {
        await unbookmarkPost(post.id);
      } else {
        await bookmarkPost(post.id);
      }
    } catch {
      patchPost(post.id, {
        is_bookmarked: wasBookmarked,
      });
    }
  };

  const handlePostDeleted = (
    post: Post
  ) => {
    setPosts((prev) =>
      prev.filter((p) => p.id !== post.id)
    );

    setSelectedPost(null);
  };

  const handlePostUpdated = (
    updated: Post
  ) => {
    /*
     * The owner's own grid keeps archived posts reachable.
     */
    patchPost(updated.id, updated);
  };

  const openCrew = () => {
    setCrewOpen(true);
    setIsCrewLoading(true);

    getFollowers(user.id)
      .then(setCrewUsers)
      .finally(() =>
        setIsCrewLoading(false)
      );
  };

  const openCircles = () => {
    setCirclesOpen(true);
    setIsCirclesLoading(true);

    getFollowing(user.id)
      .then(setCircleUsers)
      .finally(() =>
        setIsCirclesLoading(false)
      );
  };

  return (
    <AppLayout>
      <SpaceThemeWrapper theme={theme}>
        <div className={styles.topBar}>
          <button
            className={styles.themeLink}
            onClick={() =>
              setIsThemeOpen(true)
            }
          >
            Space Theme
          </button>

          <Link
            to="/settings"
            className={styles.settingsLink}
            aria-label="Settings"
          >
            Settings
          </Link>
        </div>

        <ProfileHeader
          user={user}
          isOwnProfile
          onEditProfile={openEdit}
          onShareSpace={() =>
            navigate("/space/share")
          }
          onCrewClick={openCrew}
          onCirclesClick={openCircles}
        />

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t}
              className={
                t === tab
                  ? styles.tabActive
                  : styles.tab
              }
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : visiblePosts.length === 0 ? (
          <EmptyState
            icon={<ImageIcon />}
            title={
              tab === "Keeps"
                ? "Nothing Kept yet"
                : tab === "Tagged"
                  ? "No tagged Flicks"
                  : "No Flicks yet"
            }
            description={
              tab === "Flicks"
                ? "Share your first Flick to see it here."
                : undefined
            }
          />
        ) : (
          <MediaGrid
            posts={visiblePosts}
            onSelect={setSelectedPost}
          />
        )}
      </SpaceThemeWrapper>

      {selectedPost && (
        <div
          className={styles.detailBackdrop}
          onClick={() =>
            setSelectedPost(null)
          }
        >
          <div
            className={styles.detailSheet}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div
              className={styles.detailHeader}
            >
              <button
                type="button"
                className={styles.detailClose}
                onClick={() =>
                  setSelectedPost(null)
                }
                aria-label="Close"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div
              className={styles.detailScroll}
            >
              <PostCard
                post={selectedPost}
                onLikeToggle={
                  handleLikeToggle
                }
                onBookmarkToggle={
                  handleBookmarkToggle
                }
                onCommentClick={
                  setCommentPost
                }
                onShareClick={
                  setSharePost
                }
                onDeleted={
                  handlePostDeleted
                }
                onUpdated={
                  handlePostUpdated
                }
              />
            </div>
          </div>
        </div>
      )}

      {commentPost && (
        <CommentsSheet
          post={commentPost}
          onClose={() =>
            setCommentPost(null)
          }
          onCommentCountChange={(
            count
          ) =>
            patchPost(
              commentPost.id,
              {
                comment_count: count,
              }
            )
          }
        />
      )}

      {sharePost && (
        <RushShareSheet
          isOpen={true}
          onClose={() =>
            setSharePost(null)
          }
          postId={sharePost.id}
          mediaUrl={resolveMediaUrl(
            sharePost.media?.[0]?.url
          )}
          mediaType={
            sharePost.media_type
          }
          caption={sharePost.caption}
          contentType="post"
        />
      )}

      {crewOpen && (
        <UserListModal
          title="Crew"
          users={crewUsers}
          isLoading={isCrewLoading}
          emptyMessage="No Crew yet"
          onClose={() =>
            setCrewOpen(false)
          }
          onUserClick={() =>
            setCrewOpen(false)
          }
        />
      )}

      {circlesOpen && (
        <UserListModal
          title="Circles"
          users={circleUsers}
          isLoading={isCirclesLoading}
          emptyMessage={
            "Not following anyone yet"
          }
          onClose={() =>
            setCirclesOpen(false)
          }
          onUserClick={() =>
            setCirclesOpen(false)
          }
        />
      )}

      <Modal
        isOpen={isEditOpen}
        onClose={() =>
          setIsEditOpen(false)
        }
        title="Edit Space"
      >
        <div className={styles.editForm}>
          <div
            className={
              styles.avatarEditRow
            }
          >
            <Avatar
              url={avatarUrl}
              initials={
                user.avatar_initials
              }
              size={64}
            />

            <button
              type="button"
              className={
                styles.avatarChangeBtn
              }
              onClick={() =>
                avatarInputRef.current?.click()
              }
              disabled={
                isUploadingAvatar
              }
            >
              {isUploadingAvatar
                ? "Processing…"
                : "Change Avatar"}
            </button>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={
                handleAvatarChange
              }
            />
          </div>

          <div>
            <Input
              label="FlickTag"
              value={flickTag}
              onChange={(e) =>
                setFlickTag(
                  e.target.value.replace(
                    /\s/g,
                    ""
                  )
                )
              }
            />

            {flickTagStatus ===
              "checking" && (
              <p
                className={
                  styles.tagHintMuted
                }
              >
                Checking availability…
              </p>
            )}

            {flickTagStatus ===
              "available" && (
              <p
                className={
                  styles.tagHintOk
                }
              >
                @{flickTag.toLowerCase()}{" "}
                is available
              </p>
            )}

            {flickTagStatus ===
              "taken" && (
              <p
                className={
                  styles.tagHintError
                }
              >
                That FlickTag is already
                taken
              </p>
            )}
          </div>

          <Input
            label="Display name"
            value={displayName}
            onChange={(e) =>
              setDisplayName(
                e.target.value
              )
            }
          />

          <Input
            label="Bio"
            value={bio}
            onChange={(e) =>
              setBio(e.target.value)
            }
          />

          <Input
            label="Website"
            placeholder="yourlink.com"
            value={website}
            onChange={(e) =>
              setWebsite(e.target.value)
            }
          />

          <Input
            label="Pronouns"
            placeholder="e.g. she/her"
            value={pronouns}
            onChange={(e) =>
              setPronouns(
                e.target.value
              )
            }
          />

          <Input
            label="Contact"
            placeholder="Email, phone, or link people can reach you at"
            value={contactInfo}
            onChange={(e) =>
              setContactInfo(
                e.target.value
              )
            }
          />

          <Toggle
            checked={showContact}
            onChange={setShowContact}
            label="Show Contact"
            description="Let visitors to your Space see a Contact button with the info above"
          />

          <Button
            onClick={
              handleSaveProfile
            }
            isLoading={isSaving}
            disabled={
              flickTagStatus === "taken"
            }
          >
            Save Changes
          </Button>
        </div>
      </Modal>

      <SpaceThemeEditor
        isOpen={isThemeOpen}
        onClose={() =>
          setIsThemeOpen(false)
        }
        onSaved={setTheme}
      />
    </AppLayout>
  );
}