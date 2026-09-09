import type { InputHTMLAttributes } from "react";
import { SearchIcon } from "./icons";
import styles from "./SearchBar.module.css";

interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {}

export function SearchBar(props: SearchBarProps) {
  return (
    <div className={styles.wrap}>
      <SearchIcon size={18} className={styles.icon} />
      <input className={styles.input} type="search" {...props} />
    </div>
  );
}
