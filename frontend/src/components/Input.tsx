import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

export function Input({ label, icon, error, id, ...rest }: InputProps) {
  const inputId = id || rest.name;
  return (
    <div className={styles.group}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={[styles.wrap, error ? styles.wrapError : ""].join(" ")}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input id={inputId} className={styles.input} {...rest} />
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
