import { useRef, useState, type ChangeEvent } from "react";
import { Modal } from "./Modal";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { CloseIcon } from "./icons";
import { uploadMedia } from "../services/media";
import { sendFlash } from "../services/flash";
import { useToast } from "./Toast";
import type { Conversation } from "../types";
import styles from "./FlashComposer.module.css";

interface FlashComposerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onSent: () => void;
}

export function FlashComposer({ isOpen, onClose, conversations, onSent }: FlashComposerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [isDisappearing, setIsDisappearing] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { showToast } = useToast();

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setCaption("");
    setRecipientId(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setMediaType(selected.type.startsWith("video") ? "video" : "image");
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleSend = async () => {
    if (!file || !recipientId) {
      showToast("Pick a photo/video and a recipient", "error");
      return;
    }
    setIsSending(true);
    try {
      const uploaded = await uploadMedia(file, mediaType, "private");
      await sendFlash({
        recipient_id: recipientId,
        media_url: uploaded.url,
        media_type: mediaType,
        caption,
        is_disappearing: isDisappearing,
      });
      showToast("Flash sent", "success");
      onSent();
      handleClose();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Couldn't send your Flash", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Flash">
      <div className={styles.wrap}>
        {previewUrl ? (
          <div className={styles.previewWrap}>
            {mediaType === "image" ? (
              <img src={previewUrl} alt="" className={styles.previewMedia} />
            ) : (
              <video src={previewUrl} className={styles.previewMedia} controls />
            )}
            <button className={styles.removeBtn} onClick={() => { setFile(null); setPreviewUrl(null); }} aria-label="Remove">
              <CloseIcon size={16} />
            </button>
          </div>
        ) : (
          <label className={styles.uploadBox}>
            <span>Capture or choose a photo/video</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              onChange={handleFileChange}
              className={styles.hiddenInput}
            />
          </label>
        )}

        <input
          className={styles.captionInput}
          placeholder="Add a caption…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />

        <label className={styles.disappearingRow}>
          <input type="checkbox" checked={isDisappearing} onChange={(e) => setIsDisappearing(e.target.checked)} />
          Disappears after viewing
        </label>

        <div className={styles.recipientLabel}>Send to</div>
        <div className={styles.recipientList}>
          {conversations.length === 0 ? (
            <p className={styles.emptyText}>Start a Chat first to send a Flash.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                className={recipientId === c.other_user.id ? styles.recipientActive : styles.recipient}
                onClick={() => setRecipientId(c.other_user.id)}
              >
                <Avatar url={c.other_user.avatar_url} initials={c.other_user.avatar_initials} size={40} />
                <span>{c.other_user.username}</span>
              </button>
            ))
          )}
        </div>

        <Button onClick={handleSend} isLoading={isSending}>
          Send Flash
        </Button>
      </div>
    </Modal>
  );
}
