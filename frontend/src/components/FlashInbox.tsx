import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Avatar } from "./Avatar";
import { LoadingSpinner } from "./LoadingSpinner";
import { EmptyState } from "./EmptyState";
import { FlashViewer } from "./FlashViewer";
import * as flashApi from "../services/flash";
import type { Flash } from "../services/flash";
import * as usersApi from "../services/users";
import type { UserPublic } from "../types";
import styles from "./FlashInbox.module.css";

interface FlashInboxProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FlashInbox({ isOpen, onClose }: FlashInboxProps) {
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [senders, setSenders] = useState<Record<string, UserPublic>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeFlash, setActiveFlash] = useState<Flash | null>(null);

  const load = () => {
    setIsLoading(true);
    flashApi
      .getFlashInbox()
      .then(async (rows) => {
        setFlashes(rows);
        const uniqueSenderIds = [...new Set(rows.map((f) => f.sender_id))];
        const fetched = await Promise.all(uniqueSenderIds.map((id) => usersApi.getUser(id).catch(() => null)));
        const map: Record<string, UserPublic> = {};
        fetched.forEach((u) => u && (map[u.id] = u));
        setSenders(map);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  const handleFlashClosed = () => {
    setActiveFlash(null);
    load(); // refresh seen-state / remove unsent items
  };

  return (
    <>
      <Modal isOpen={isOpen && !activeFlash} onClose={onClose} title="Flash">
        {isLoading ? (
          <LoadingSpinner />
        ) : flashes.length === 0 ? (
          <EmptyState title="No Flash yet" description="Quick private photos and videos will show up here." />
        ) : (
          <div className={styles.list}>
            {flashes.map((f) => {
              const sender = senders[f.sender_id];
              return (
                <button key={f.id} className={styles.row} onClick={() => setActiveFlash(f)}>
                  <Avatar url={sender?.avatar_url} initials={sender?.avatar_initials || "?"} size={44} />
                  <div className={styles.info}>
                    <span className={styles.name}>{sender?.username || "Someone"}</span>
                    <span className={f.seen_at ? styles.statusSeen : styles.statusNew}>
                      {f.seen_at ? "Opened" : "New Flash"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      {activeFlash && (
        <FlashViewer flash={activeFlash} sender={senders[activeFlash.sender_id]} onClose={handleFlashClosed} />
      )}
    </>
  );
}
