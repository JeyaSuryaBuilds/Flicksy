import { NavLink } from "react-router-dom";
import { HomeIcon, SearchIcon, PlusIcon, RushIcon, UserIcon } from "./icons";
import { Avatar } from "./Avatar";
import { useAuth } from "../hooks/useAuth";
import styles from "./BottomNavigation.module.css";

export function BottomNavigation() {
  const { user } = useAuth();

  return (
    <nav className={styles.nav} aria-label="Primary">
      <NavLink to="/home" className={({ isActive }) => (isActive ? styles.itemActive : styles.item)} end aria-label="Stream">
        <HomeIcon />
      </NavLink>
      <NavLink to="/explore" className={({ isActive }) => (isActive ? styles.itemActive : styles.item)} aria-label="Discover">
        <SearchIcon />
      </NavLink>
      <NavLink to="/create" className={styles.createBtn} aria-label="Make">
        <PlusIcon size={20} />
      </NavLink>
      <NavLink to="/rush" className={({ isActive }) => (isActive ? styles.itemActive : styles.item)} aria-label="Rush">
        <RushIcon />
      </NavLink>
      <NavLink to="/profile" className={styles.item} aria-label="Your Space">
        {user ? (
          <Avatar url={user.avatar_url} initials={user.avatar_initials} size={26} />
        ) : (
          <UserIcon size={23} />
        )}
      </NavLink>
    </nav>
  );
}
