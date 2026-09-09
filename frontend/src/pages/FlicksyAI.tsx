import { useEffect, useRef, useState, type FormEvent } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { SparkleIcon, SendIcon, CloseIcon } from "../components/icons";
import * as aiApi from "../services/ai";
import type { AIConversation, AIMessage } from "../types";
import { useToast } from "../components/Toast";
import styles from "./FlicksyAI.module.css";

const SUGGESTED_PROMPTS = [
  "Write a caption for this Flick",
  "Give me Rush ideas",
  "Improve my bio",
  "Suggest Topic Tags",
  "Make this caption funny",
  "Translate this",
  "Help me plan my content",
];

export function FlicksyAI() {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const { showToast } = useToast();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    aiApi
      .listAIConversations()
      .then(setConversations)
      .finally(() => setIsLoadingHistory(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConversation = async (id: string) => {
    setActiveId(id);
    setError("");
    try {
      const msgs = await aiApi.getAIConversationMessages(id);
      setMessages(msgs);
    } catch {
      showToast("Couldn't load that conversation", "error");
    }
  };

  const startNewConversation = () => {
    setActiveId(null);
    setMessages([]);
    setError("");
  };

  const send = async (text: string) => {
    if (!text.trim()) return;
    setError("");
    setLastFailedMessage(null);
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString() },
    ]);
    setIsSending(true);
    try {
      const res = await aiApi.sendAIChat(text, activeId);
      setMessages((prev) => [
        ...prev,
        { id: `${res.conversation_id}-${Date.now()}`, role: "assistant", content: res.reply, provider: res.provider, created_at: new Date().toISOString() },
      ]);
      if (!activeId) {
        setActiveId(res.conversation_id);
        const convos = await aiApi.listAIConversations();
        setConversations(convos);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Flicksy AI couldn't respond — try again.";
      setError(detail);
      setLastFailedMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleRetry = () => {
    if (lastFailedMessage) send(lastFailedMessage);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard?.writeText(content);
    showToast("Copied to clipboard", "success");
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await aiApi.deleteAIConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) startNewConversation();
    } catch {
      showToast("Couldn't delete this conversation", "error");
    }
  };

  return (
    <AppLayout>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <SparkleIcon size={20} className={styles.sparkle} />
            <h1>Flicksy AI</h1>
          </div>
          <button className={styles.newBtn} onClick={startNewConversation}>
            New chat
          </button>
        </div>

        {conversations.length > 0 && (
          <div className={styles.historyRow}>
            {conversations.map((c) => (
              <div key={c.id} className={c.id === activeId ? styles.historyChipActive : styles.historyChip}>
                <button onClick={() => openConversation(c.id)}>{c.title || "Conversation"}</button>
                <button
                  className={styles.historyChipClose}
                  onClick={() => handleDeleteConversation(c.id)}
                  aria-label="Delete conversation"
                >
                  <CloseIcon size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.messages}>
          {isLoadingHistory ? (
            <LoadingSpinner />
          ) : messages.length === 0 ? (
            <div className={styles.emptyWrap}>
              <EmptyState
                icon={<SparkleIcon />}
                title="Ask Flicksy AI anything"
                description="Captions, Rush ideas, bio help, Topic Tags, tone rewrites, translation — all in one place."
              />
              <div className={styles.prompts}>
                {SUGGESTED_PROMPTS.map((p) => (
                  <button key={p} className={styles.promptChip} onClick={() => send(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? styles.rowOwn : styles.row}>
                <div className={m.role === "user" ? styles.bubbleOwn : styles.bubble}>
                  <p className={styles.text}>{m.content}</p>
                  {m.role === "assistant" && (
                    <div className={styles.bubbleActions}>
                      {m.provider && <span className={styles.providerTag}>{m.provider}</span>}
                      <button onClick={() => handleCopy(m.content)}>Copy</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className={styles.row}>
              <div className={styles.bubble}>
                <LoadingSpinner size={18} />
              </div>
            </div>
          )}

          {error && (
            <div className={styles.errorBox} role="alert">
              <span>{error}</span>
              {lastFailedMessage && (
                <button onClick={handleRetry} className={styles.retryBtn}>
                  Retry
                </button>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form className={styles.inputRow} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            placeholder="Ask Flicksy AI…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className={styles.sendBtn} disabled={isSending || !input.trim()} aria-label="Send">
            <SendIcon size={18} />
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
