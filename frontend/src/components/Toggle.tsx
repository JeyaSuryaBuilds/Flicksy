import styles from "./Toggle.module.css";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <label className={styles.row}>
      <div>
        <div className={styles.label}>{label}</div>
        {description && <div className={styles.desc}>{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={checked ? styles.switchOn : styles.switchOff}
        onClick={() => onChange(!checked)}
      >
        <span className={checked ? styles.knobOn : styles.knobOff} />
      </button>
    </label>
  );
}
