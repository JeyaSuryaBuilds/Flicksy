import { NavLink } from "react-router-dom";
import { HomeIcon, SearchIcon, PlusIcon, RushIcon, BellIcon, UserIcon, MessageIcon, SparkleIcon, SettingsIcon } from "./icons";
import { Avatar } from "./Avatar";
import { useAuth } from "../hooks/useAuth";
import styles from "./DesktopSidebar.module.css";

const primaryLinks = [
  { to: "/home", label: "Stream", Icon: HomeIcon },
  { to: "/explore", label: "Discover", Icon: SearchIcon },
  { to: "/create", label: "Make", Icon: PlusIcon },
  { to: "/rush", label: "Rush", Icon: RushIcon },
];

const secondaryLinks = [
  { to: "/messages", label: "Chats", Icon: MessageIcon },
  { to: "/notifications", label: "Alerts", Icon: BellIcon },
  { to: "/flickzy-ai", label: "flickzy AI", Icon: SparkleIcon },
];

export function DesktopSidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className={styles.sidebar} aria-label="Primary">
      <div className={styles.wordmark}>
        flick<span>zy</span>
      </div>

      <nav className={styles.links}>
        {primaryLinks.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
        <NavLink to="/profile" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
          {user ? <Avatar url={user.avatar_url} initials={user.avatar_initials} size={21} /> : <UserIcon size={21} />}
          <span>Space</span>
        </NavLink>

        <div className={styles.divider} />

        {secondaryLinks.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
        {user?.is_admin && (
          <NavLink to="/admin" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            <SettingsIcon size={21} />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      <NavLink to="/settings" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
        <SettingsIcon size={21} />
        <span>Settings</span>
      </NavLink>
      <button className={styles.logout} onClick={() => logout()}>
        Log out
      </button>
    </aside>
  );
}
