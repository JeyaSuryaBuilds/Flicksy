import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { getMentionableUsers } from "../services/users";
import type { UserPublic } from "../types";
import styles from "./MentionInput.module.css";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  autoFocus?: boolean;
  /** Fired on Enter for single-line fields (e.g. submitting a comment) — only
   *  called when the mention dropdown isn't open, so Enter selects a
   *  highlighted suggestion instead of submitting while one is showing. */
  onEnter?: () => void;
}

/** Finds an in-progress "@token" ending at the caret, if any — e.g. typing
 *  "check this out @sur" with the caret at the end returns "sur". Returns
 *  null once the token is broken by whitespace (mention typing is "closed"),
 *  so the dropdown doesn't linger after the user moves on. */
function findActiveMention(text: string, caret: number): { start: number; query: string } | null {
  const upToCaret = text.slice(0, caret);
  const at = upToCaret.lastIndexOf("@");
  if (at === -1) return null;

  const beforeAt = upToCaret[at - 1];
  if (beforeAt && /\w/.test(beforeAt)) return null; // "email@x" isn't a mention

  const token = upToCaret.slice(at + 1);
  if (/\s/.test(token)) return null; // mention token ended at a space

  return { start: at, query: token };
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  className,
  multiline = false,
  rows = 3,
  maxLength,
  autoFocus,
  onEnter,
}: MentionInputProps) {
  const fieldRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [active, setActive] = useState<{ start: number; query: string } | null>(null);
  const [suggestions, setSuggestions] = useState<UserPublic[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (active === null) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    const handle = setTimeout(() => {
      getMentionableUsers(active.query)
        .then((users) => {
          if (!cancelled) setSuggestions(users);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [active]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const nextValue = e.target.value;
    const caret = e.target.selectionStart ?? nextValue.length;
    onChange(nextValue);
    setActive(findActiveMention(nextValue, caret));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === "Escape" && active) {
      setActive(null);
      return;
    }
    if (e.key === "Enter" && active) {
      // Suggestions are open — don't submit/newline on a half-typed mention.
      // (Selecting a suggestion is currently mouse/tap only.)
      e.preventDefault();
      return;
    }
    if (e.key === "Enter" && !multiline && !active && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  const selectSuggestion = (user: UserPublic) => {
    if (!active) return;
    const field = fieldRef.current;
    const caret = field?.selectionStart ?? active.start + active.query.length + 1;
    const mentionText = `@${user.username} `;
    const nextValue = value.slice(0, active.start) + mentionText + value.slice(caret);
    onChange(nextValue);
    setActive(null);

    requestAnimationFrame(() => {
      if (!field) return;
      const newCaret = active.start + mentionText.length;
      field.focus();
      field.setSelectionRange(newCaret, newCaret);
    });
  };

  const sharedProps = {
    ref: fieldRef as any,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    placeholder,
    className,
    maxLength,
    autoFocus,
  };

  return (
    <div className={styles.wrap}>
      {multiline ? <textarea {...sharedProps} rows={rows} /> : <input {...sharedProps} type="text" />}

      {active !== null && (isLoading || suggestions.length > 0) && (
        <div className={styles.dropdown}>
          {isLoading ? (
            <div className={styles.loading}>Searching…</div>
          ) : (
            suggestions.map((user) => (
              <button
                key={user.id}
                type="button"
                className={styles.suggestion}
                // onMouseDown (not onClick) so this fires before the field's onBlur would close things.
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(user);
                }}
              >
                <Avatar url={user.avatar_url} initials={user.avatar_initials} size={32} />
                <span className={styles.suggestionName}>
                  {user.username}
                  {user.is_verified && <VerifiedBadge size={11} />}
                  <span className={styles.suggestionDisplay}>{user.display_name}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}