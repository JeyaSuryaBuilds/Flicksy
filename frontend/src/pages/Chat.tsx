import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ChatBubble } from "../components/ChatBubble";
import { Avatar } from "../components/Avatar";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { BackIcon, SendIcon } from "../components/icons";
import { getConversationMessages, sendMessage, getConversations } from "../services/messages";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import type { Conversation, Message } from "../types";
import styles from "./Chat.module.css";

export function Chat() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [body, setBody] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    setIsLoading(true);
    Promise.all([getConversationMessages(conversationId), getConversations()])
      .then(([msgs, conversations]) => {
        setMessages(msgs);
        setConversation(conversations.find((c) => c.id === conversationId) || null);
      })
      .catch(() => showToast("Couldn't load this conversation", "error"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !conversationId) return;
    const text = body.trim();
    setBody("");
    try {
      const message = await sendMessage(conversationId, text);
      setMessages((prev) => [...prev, message]);

      // Lightweight simulated reply so the chat screen feels alive in the demo build —
      // replace with a real-time channel (websockets) for production.
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1400);
    } catch {
      showToast("Message didn't send, try again", "error");
      setBody(text);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.wrap}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <Link to="/messages" className={styles.backBtn} aria-label="Back to conversations">
          <BackIcon />
        </Link>
        {conversation && (
          <>
            <Avatar url={conversation.other_user.avatar_url} initials={conversation.other_user.avatar_initials} size={36} />
            <div>
              <div className={styles.name}>{conversation.other_user.username}</div>
              <div className={styles.status}>Active recently</div>
            </div>
          </>
        )}
      </div>

      <div className={styles.messages}>
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} isOwn={m.sender_id === user?.id} />
        ))}
        {isTyping && <div className={styles.typing}>typing…</div>}
        <div ref={bottomRef} />
      </div>

      <form className={styles.inputRow} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          placeholder="Message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className={styles.sendBtn} disabled={!body.trim()} aria-label="Send message">
          <SendIcon size={18} />
        </button>
      </form>
    </div>
  );
}
