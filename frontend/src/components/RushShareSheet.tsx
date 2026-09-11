import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "./Avatar";
import { CloseIcon } from "./icons";
import { getConversations, sendMessage } from "../services/messages";
import { useToast } from "./Toast";
import type { Conversation } from "../types";
import styles from "./RushShareSheet.module.css";

interface RushShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  mediaUrl: string;
  caption?: string;
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
      <path
        d="M10 13.5 14 10m-7.2 7.2 1.4 1.4a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0 0-5.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m14 10.5-4 3.5m7.2-7.2-1.4-1.4a4 4 0 0 0-5.7 0L7.3 8.2a4 4 0 0 0 0 5.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
      <path
        d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
      <circle
        cx="18"
        cy="5"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="6"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="18"
        cy="19"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m8.2 10.8 7.5-4.4M8.2 13.2l7.5 4.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MomentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 12h8M12 8v8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RushShareSheet({
  isOpen,
  onClose,
  postId,
  mediaUrl,
  caption,
}: RushShareSheetProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<
    Conversation[]
  >([]);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const rushLink = `${window.location.origin}/r/${postId}`;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setQuery("");
    setSelectedIds([]);

    let cancelled = false;

    setIsLoading(true);

    getConversations()
      .then((items) => {
        if (!cancelled) {
          setConversations(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          showToast(
            "Couldn't load your Chats",
            "error",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, showToast]);

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      conversation.other_user.username
        .toLowerCase()
        .includes(normalized),
    );
  }, [conversations, query]);

  if (!isOpen) {
    return null;
  }

  const toggleRecipient = (conversationId: string) => {
    setSelectedIds((prev) =>
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId],
    );
  };

  const handleSendToSelected = async () => {
    if (!selectedIds.length) {
      showToast(
        "Choose someone to send this Rush",
        "error",
      );
      return;
    }

    setIsSending(true);

    try {
      const message = caption
        ? `Check out this Rush: ${rushLink}\n${caption}`
        : `Check out this Rush: ${rushLink}`;

      await Promise.all(
        selectedIds.map((conversationId) =>
          sendMessage(conversationId, message),
        ),
      );

      showToast("Rush sent", "success");
      setSelectedIds([]);
      onClose();
    } catch {
      showToast(
        "Couldn't send the Rush",
        "error",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(rushLink);
      showToast("Rush link copied", "success");
    } catch {
      showToast(
        "Couldn't copy the link",
        "error",
      );
    }
  };

  const handleDownload = async () => {
    if (!mediaUrl) {
      showToast(
        "Media isn't available",
        "error",
      );
      return;
    }

    try {
      const response = await fetch(mediaUrl);

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `flickzy-rush-${postId}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(objectUrl);

      showToast(
        "Rush saved",
        "success",
      );
    } catch {
      /**
       * Fallback for browsers that block
       * cross-origin blob downloads.
       */
      const anchor = document.createElement("a");
      anchor.href = mediaUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.download = "";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Flickzy Rush",
          text: caption || "Check out this Rush on Flickzy",
          url: rushLink,
        });
        return;
      } catch {
        /**
         * User cancelled native share.
         */
        return;
      }
    }

    await handleCopyLink();
  };

  const handleAddToMoments = () => {
    onClose();

    /**
     * Open Moment creator.
     *
     * The current MomentCompose can later be extended
     * to accept this media URL as an imported asset.
     */
    navigate(
      `/create/moment?source=rush&media=${encodeURIComponent(
        mediaUrl,
      )}`,
    );
  };

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
    >
      <section
        className={styles.sheet}
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
        aria-label="Share Rush"
      >
        <div className={styles.handle} />

        <div className={styles.header}>
          <h2>Send Rush</h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon size={21} />
          </button>
        </div>

        <div className={styles.searchWrap}>
          <svg
            viewBox="0 0 24 24"
            width="21"
            height="21"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="10.8"
              cy="10.8"
              r="6.8"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="m16 16 5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          <input
            type="search"
            placeholder="Search Crew or Circles"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
          />
        </div>

        <div className={styles.recipientArea}>
          {isLoading ? (
            <div className={styles.status}>
              Loading your Chats…
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className={styles.status}>
              No Chats found
            </div>
          ) : (
            <div className={styles.recipientGrid}>
              {filteredConversations.map(
                (conversation) => {
                  const selected =
                    selectedIds.includes(
                      conversation.id,
                    );

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      className={
                        selected
                          ? styles.recipientSelected
                          : styles.recipient
                      }
                      onClick={() =>
                        toggleRecipient(
                          conversation.id,
                        )
                      }
                    >
                      <div
                        className={
                          styles.avatarWrap
                        }
                      >
                        <Avatar
                          url={
                            conversation
                              .other_user
                              .avatar_url
                          }
                          initials={
                            conversation
                              .other_user
                              .avatar_initials
                          }
                          size={58}
                        />

                        {selected && (
                          <span
                            className={
                              styles.selectedBadge
                            }
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      <span
                        className={
                          styles.username
                        }
                      >
                        {
                          conversation
                            .other_user
                            .username
                        }
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          )}
        </div>

        {selectedIds.length > 0 && (
          <button
            type="button"
            className={styles.sendButton}
            onClick={handleSendToSelected}
            disabled={isSending}
          >
            {isSending
              ? "Sending…"
              : `Send to ${selectedIds.length}`}
          </button>
        )}

        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.action}
            onClick={handleAddToMoments}
          >
            <span className={styles.actionIcon}>
              <MomentIcon />
            </span>
            <span>Add to Moments</span>
          </button>

          <button
            type="button"
            className={styles.action}
            onClick={handleCopyLink}
          >
            <span className={styles.actionIcon}>
              <LinkIcon />
            </span>
            <span>Copy link</span>
          </button>

          <button
            type="button"
            className={styles.action}
            onClick={handleDownload}
          >
            <span className={styles.actionIcon}>
              <DownloadIcon />
            </span>
            <span>Download</span>
          </button>

          <button
            type="button"
            className={styles.action}
            onClick={handleNativeShare}
          >
            <span className={styles.actionIcon}>
              <ShareIcon />
            </span>
            <span>Share</span>
          </button>
        </div>
      </section>
    </div>
  );
}