import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Post } from "../types";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { PostActions } from "./PostActions";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";
import { MoreIcon, PlayIcon, SpeakerIcon } from "./icons";
import { timeAgo } from "../utils/time";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./Toast";
import { deletePost, updatePost, archivePost, unarchivePost, pinPost, unpinPost } from "../services/posts";
import { reportContent } from "../services/reports";
import { resolveMediaUrl } from "../utils/media";
import styles from "./PostCard.module.css";

interface PostCardProps {
  post: Post;
  onLikeToggle: (post: Post) => void;
  onBookmarkToggle: (post: Post) => void;
  onCommentClick: (post: Post) => void;
  onShareClick: (post: Post) => void;
  onDeleted?: (post: Post) => void;
  /** Fired after Edit/Archive/Unarchive/Pin/Unpin succeeds, with the fresh post from the
   *  server, so the parent list (Home/Explore/Profile) can patch its own state — e.g.
   *  removing a freshly-archived post from a feed it should no longer appear in. */
  onUpdated?: (post: Post) => void;
}

export function PostCard({ post, onLikeToggle, onBookmarkToggle, onCommentClick, onShareClick, onDeleted, onUpdated }: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [editLocation, setEditLocation] = useState(post.location);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const isOwn = user?.id === post.author.id;
  const mediaUrl = resolveMediaUrl(post.media?.[0]?.url);

  const toggleVideoPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    try {
      await deletePost(post.id);
      showToast("Flick deleted", "success");
      onDeleted?.(post);
    } catch {
      showToast("Couldn't delete this Flick", "error");
    }
  };

  const handleReport = async () => {
    setMenuOpen(false);
    try {
      await reportContent("post", post.id, "inappropriate_content");
      showToast("Thanks — we've received your report", "success");
    } catch {
      showToast("Couldn't submit report", "error");
    }
  };

  const openEdit = () => {
    setMenuOpen(false);
    setEditCaption(post.caption);
    setEditLocation(post.location);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      const updated = await updatePost(post.id, {
        caption: editCaption,
        location: editLocation,
        media_type: post.media_type,
        media_tag: post.media_tag,
        media_urls: post.media.map((m) => m.url),
      });
      showToast("Flick updated", "success");
      setIsEditOpen(false);
      onUpdated?.(updated);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Couldn't update this Flick", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleArchiveToggle = async () => {
    setMenuOpen(false);
    setIsWorking(true);
    try {
      const updated = post.is_archived ? await unarchivePost(post.id) : await archivePost(post.id);
      showToast(post.is_archived ? "Flick unarchived" : "Flick archived", "success");
      onUpdated?.(updated);
    } catch {
      showToast(post.is_archived ? "Couldn't unarchive this Flick" : "Couldn't archive this Flick", "error");
    } finally {
      setIsWorking(false);
    }
  };

  const handlePinToggle = async () => {
    setMenuOpen(false);
    setIsWorking(true);
    try {
      const updated = post.is_pinned ? await unpinPost(post.id) : await pinPost(post.id);
      showToast(post.is_pinned ? "Unpinned from your Space" : "Pinned to your Space", "success");
      onUpdated?.(updated);
    } catch {
      showToast(post.is_pinned ? "Couldn't unpin this Flick" : "Couldn't pin this Flick", "error");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <>
    <article className={styles.post}>
      <div className={styles.head}>
        <Link to={`/users/${post.author.id}`} className={styles.userLink}>
          <Avatar url={post.author.avatar_url} initials={post.author.avatar_initials} size={38} />
          <div>
            <div className={styles.uname}>
              {post.author.username}
              {post.author.is_verified && <VerifiedBadge size={12} />}
            </div>
            {post.location && <div className={styles.uloc}>{post.location}</div>}
          </div>
        </Link>
        <div className={styles.menuWrap}>
          <button className={styles.moreBtn} aria-label="More options" onClick={() => setMenuOpen((v) => !v)}>
            <MoreIcon />
          </button>
          {menuOpen && (
            <>
              <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} />
              <div className={styles.menu} role="menu">
                {isOwn ? (
                  <>
                    <button className={styles.menuItem} onClick={openEdit} role="menuitem">
                      Edit
                    </button>
                    <button className={styles.menuItem} onClick={handlePinToggle} disabled={isWorking} role="menuitem">
                      {post.is_pinned ? "Unpin" : "Pin"}
                    </button>
                    <button className={styles.menuItem} onClick={handleArchiveToggle} disabled={isWorking} role="menuitem">
                      {post.is_archived ? "Unarchive" : "Archive"}
                    </button>
                    <button className={styles.menuItemDanger} onClick={handleDelete} role="menuitem">
                      Delete Flick
                    </button>
                  </>
                ) : (
                  <button className={styles.menuItem} onClick={handleReport} role="menuitem">
                    Report Flick
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.media}>
        {mediaUrl ? (
          post.media_type === "video" ? (
            <>
              <video
                ref={videoRef}
                className={styles.mediaContent}
                src={mediaUrl}
                muted={isMuted}
                loop
                playsInline
                preload="metadata"
                onClick={toggleVideoPlayback}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              {!isPlaying && (
                <button
                  type="button"
                  className={styles.playOverlayBtn}
                  onClick={toggleVideoPlayback}
                  aria-label="Play video"
                >
                  <PlayIcon size={22} />
                </button>
              )}
              <button
                type="button"
                className={styles.speakerButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((v) => !v);
                }}
                aria-label={isMuted ? "Unmute video" : "Mute video"}
              >
                <SpeakerIcon size={16} muted={isMuted} />
              </button>
            </>
          ) : (
            <img className={styles.mediaContent} src={mediaUrl} alt={post.caption || ""} draggable={false} />
          )
        ) : null}
        {post.media_type === "video" && (
          <span className={styles.mediaTag}>
            <PlayIcon />
            {post.media_tag}
          </span>
        )}
      </div>

      <PostActions
        isLiked={post.is_liked}
        isBookmarked={post.is_bookmarked}
        onLikeToggle={() => onLikeToggle(post)}
        onCommentClick={() => onCommentClick(post)}
        onShareClick={() => onShareClick(post)}
        onBookmarkToggle={() => onBookmarkToggle(post)}
      />

      <div className={styles.likes}>{post.like_count.toLocaleString()} Loves</div>
      {post.caption && (
        <p className={styles.caption}>
          <b>{post.author.username}</b> {post.caption}
        </p>
      )}
      {post.comment_count > 0 && (
        <button className={styles.commentsLink} onClick={() => onCommentClick(post)}>
          View all {post.comment_count} Echoes
        </button>
      )}
      <div className={styles.timestamp}>{timeAgo(post.created_at)}</div>
    </article>

    <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Flick">
      <div className={styles.editForm}>
        <Input label="Caption" value={editCaption} onChange={(e) => setEditCaption(e.target.value)} />
        <Input label="Location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
        <Button onClick={handleSaveEdit} isLoading={isSavingEdit}>
          Save Changes
        </Button>
      </div>
    </Modal>
    </>
  );
}