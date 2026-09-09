import type { ReactNode } from "react";
import styles from "./AuthLayout.module.css";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.stage}>
      <div className={styles.frame}>
        <div className="bg-blob-a" />
        <div className="bg-blob-b" />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
