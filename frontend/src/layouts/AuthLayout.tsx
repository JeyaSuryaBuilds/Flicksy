import type { ReactNode } from "react";
import styles from "./AuthLayout.module.css";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.stage}>
      <div className={styles.frame}>
        {/* Desktop-only branding panel — hidden on mobile via CSS, where the
            existing per-page wordmark + bg-blob decoration is all that's shown. */}
        <div className={styles.brandPane} aria-hidden="true">
          <div className={styles.brandGlow} />
          <div className={styles.brandContent}>
            <div className={styles.brandWordmark}>
              flick<span>zy</span>
            </div>
            <p className={styles.brandTagline}>Your world, your flickzy.</p>
          </div>
        </div>

        <div className="bg-blob-a" />
        <div className="bg-blob-b" />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}