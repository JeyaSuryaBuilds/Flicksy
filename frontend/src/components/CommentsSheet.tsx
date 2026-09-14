import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { CommentItem } from "./CommentItem";
import { LoadingSpinner } from "./LoadingSpinner";
import { EmptyState } from "./EmptyState";
import { SendIcon, CommentIcon } from "./icons";
import { MentionInput } from "./MentionInput";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./Toast";
import * as commentsApi from "../services/comments";
import type { Comment, Post } from "../types";
import styles from "./CommentsSheet.module.css";
import { Avatar } from "./Avatar";

interface CommentsSheetProps {
  post: Post;
  onClose: () => void;
  onCommentCountChange: (count: number) => void;
}

export function CommentsSheet({ post, onClose, onCommentCountChange }: CommentsSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    commentsApi
      .getComments(post.id)
      .then(setComments)
      .catch(() => showToast("Couldn't load comments", "error"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setIsSending(true);
    try {
      const comment = await commentsApi.addComment(post.id, body.trim());
      const next = [...comments, comment];
      setComments(next);
      onCommentCountChange(next.length);
      setBody("");
    } catch {
      showToast("Couldn't post your comment", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleLikeToggle = async (comment: Comment) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? { ...c, is_liked: !c.is_liked, like_count: c.like_count + (c.is_liked ? -1 : 1) }
          : c
      )
    );
    try {
      if (!comment.is_liked) await commentsApi.likeComment(comment.id);
    } catch {
      // silently ignore — optimistic UI already reflected attempt
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Echoes">
      {isLoading ? (
        <LoadingSpinner />
      ) : comments.length === 0 ? (
        <EmptyState icon={<CommentIcon />} title="No Echoes yet" description="Be the first to say something." />
      ) : (
        <div className={styles.list}>
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} onLikeToggle={handleLikeToggle} />
          ))}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <Avatar  url={user?.avatar_url}  initials={user?.avatar_initials}  size={32}/>
        <MentionInput
          className={styles.input}
          placeholder="Add an Echo… (type @ to mention someone)"
          value={body}
          onChange={setBody}
          maxLength={500}
        />
        <button type="submit" className={styles.sendBtn} disabled={isSending || !body.trim()} aria-label="Post comment">
          <SendIcon size={18} />
        </button>
      </form>
    </Modal>
  );
}