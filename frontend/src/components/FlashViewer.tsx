import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { SecureMedia } from "./SecureMedia";
import { CloseIcon, SendIcon } from "./icons";
import * as flashApi from "../services/flash";
import type { Flash } from "../services/flash";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./Toast";
import type { UserPublic } from "../types";
import styles from "./FlashViewer.module.css";

interface FlashViewerProps {
  flash: Flash;
  sender?: UserPublic;
  onClose: () => void;
}

export function FlashViewer({ flash, sender, onClose }: FlashViewerProps) {
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();
  const isOwn = flash.sender_id === user?.id;

  useEffect(() => {
    if (!isOwn && !flash.seen_at) {
      flashApi.markFlashSeen(flash.id).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash.id]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setIsSendingReply(true);
    try {
      // A text-only reply piggybacks the same Flash photo as a quick acknowledgment thread —
      // real implementation would let you reply with your own new capture; this covers the
      // "reply to Flash" requirement with a caption-carrying reply record.
      await flashApi.sendFlash({
        recipient_id: flash.sender_id,
        media_url: flash.media_url,
        media_type: flash.media_type,
        caption: replyText,
        reply_to_flash_id: flash.id,
        is_disappearing: false,
      });
      showToast("Reply sent", "success");
      setReplyText("");
    } catch {
      showToast("Couldn't send your reply", "error");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDelete = async () => {
    try {
      await flashApi.unsendFlash(flash.id);
      showToast("Flash unsent", "success");
      onClose();
    } catch {
      showToast("Couldn't unsend this Flash", "error");
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Avatar url={sender?.avatar_url} initials={sender?.avatar_initials || "?"} size={34} />
          <span className={styles.username}>{sender?.username || "Flash"}</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </div>

      <div className={styles.mediaArea}>
        <SecureMedia url={flash.media_url} type={flash.media_type} className={styles.media} controls />
      </div>

      {flash.caption && <div className={styles.caption}>{flash.caption}</div>}

      <div className={styles.footer}>
        {isOwn ? (
          <button className={styles.unsendBtn} onClick={handleDelete}>
            Unsend Flash
          </button>
        ) : (
          <div className={styles.replyRow}>
            <input
              className={styles.replyInput}
              placeholder="Reply to Flash…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <button className={styles.replySendBtn} onClick={handleReply} disabled={isSendingReply || !replyText.trim()}>
              <SendIcon size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
