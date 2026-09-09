import styles from "./LoadingSpinner.module.css";

export function LoadingSpinner({ size = 28, label = "Loading" }: { size?: number; label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={styles.spinner} style={{ width: size, height: size }} />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
