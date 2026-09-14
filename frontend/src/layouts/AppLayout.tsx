import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { DesktopSidebar } from "../components/DesktopSidebar";
import { TopNavigation } from "../components/TopNavigation";
import { BottomNavigation } from "../components/BottomNavigation";
import styles from "./AppLayout.module.css";

interface AppLayoutProps {
  children: ReactNode;
  /** Render a right-hand suggestions rail on desktop (e.g. Home feed). */
  rightRail?: ReactNode;
  /** Hide the top bar (used by full-bleed screens like Chat). */
  hideTopBar?: boolean;
  /** Hide the bottom bar (used by full-bleed screens like Chat). */
  hideBottomBar?: boolean;
}

export function AppLayout({ children, rightRail, hideTopBar, hideBottomBar }: AppLayoutProps) {
  const location = useLocation();
  const showTopBar = !hideTopBar && location.pathname === "/home";

  return (
    <div className={styles.shell}>
      <DesktopSidebar />
      <div className={styles.main}>
        {showTopBar && <TopNavigation />}
        <div className={styles.centerColumn}>
          <div className={styles.content}>{children}</div>
          {rightRail && <aside className={styles.rightRail}>{rightRail}</aside>}
        </div>
      </div>
      {!hideBottomBar && <BottomNavigation />}
    </div>
  );
}
