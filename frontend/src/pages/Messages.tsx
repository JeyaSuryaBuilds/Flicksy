import { useEffect, useMemo, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { MessageItem } from "../components/MessageItem";
import { SearchBar } from "../components/SearchBar";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { FlashComposer } from "../components/FlashComposer";
import { FlashInbox } from "../components/FlashInbox";
import { MessageIcon } from "../components/icons";
import { getConversations } from "../services/messages";
import { useToast } from "../components/Toast";
import type { Conversation } from "../types";
import styles from "./Messages.module.css";

export function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFlashOpen, setIsFlashOpen] = useState(false);
  const [isFlashInboxOpen, setIsFlashInboxOpen] = useState(false);
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { showToast } = useToast();

  useEffect(() => {
    getConversations()
      .then(setConversations)
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(
    () => conversations.filter((c) => c.other_user.username.toLowerCase().includes(query.toLowerCase())),
    [conversations, query]
  );

  // On mobile, showing the conversation list and the open chat are mutually exclusive routes.
  // On desktop/tablet (>=768px) both render side by side via CSS, matching the two-column spec.
  const listContent = (
    <div className={conversationId ? styles.listHiddenOnMobile : styles.list}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Chats</h1>
          <button className={styles.flashInboxBtn} onClick={() => setIsFlashInboxOpen(true)}>
            Flash
          </button>
        </div>
        <SearchBar
          placeholder="Search Chats"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<MessageIcon />} title="No Chats yet" description="Message a Crew member to get started." />
      ) : (
        filtered.map((c) => <MessageItem key={c.id} conversation={c} />)
      )}
    </div>
  );

  return (
    <AppLayout hideBottomBar={!!conversationId}>
      <div className={styles.twoColumn}>
        {listContent}
        <div className={conversationId ? styles.chatVisible : styles.chatHiddenOnMobile}>
          {conversationId ? (
            <Outlet />
          ) : (
            <div className={styles.placeholder}>
              <MessageIcon size={30} />
              <p>Select a Chat to start talking</p>
            </div>
          )}
        </div>
      </div>

      {!conversationId && (
        <button className={styles.flashFab} onClick={() => setIsFlashOpen(true)} aria-label="New Flash">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#15130F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13,2 3,14 11,14 9,22 21,10 13,10" fill="#15130F" stroke="none" />
          </svg>
        </button>
      )}

      <FlashComposer
        isOpen={isFlashOpen}
        onClose={() => setIsFlashOpen(false)}
        conversations={conversations}
        onSent={() => showToast("Flash delivered", "success")}
      />

      <FlashInbox isOpen={isFlashInboxOpen} onClose={() => setIsFlashInboxOpen(false)} />
    </AppLayout>
  );
}
