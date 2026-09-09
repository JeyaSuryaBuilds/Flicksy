import { useState, type InputHTMLAttributes } from "react";
import styles from "./Input.module.css";
import { LockIcon, EyeIcon, EyeOffIcon } from "./icons";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function PasswordInput({ label, error, id, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id || rest.name;

  return (
    <div className={styles.group}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={[styles.wrap, error ? styles.wrapError : ""].join(" ")}>
        <span className={styles.icon}>
          <LockIcon />
        </span>
        <input id={inputId} type={visible ? "text" : "password"} className={styles.input} {...rest} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          style={{ background: "none", border: "none", color: "var(--color-muted)", display: "flex" }}
        >
          {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
