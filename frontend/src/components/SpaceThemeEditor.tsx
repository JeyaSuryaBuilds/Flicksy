import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { LoadingSpinner } from "./LoadingSpinner";
import * as spaceThemeApi from "../services/spaceTheme";
import type { SpaceTheme } from "../services/spaceTheme";
import { useToast } from "./Toast";
import styles from "./SpaceThemeEditor.module.css";

const PRESETS: { id: SpaceTheme["preset"]; label: string; accent: string; bg: string }[] = [
  { id: "midnight", label: "Midnight", accent: "#FF6B4A", bg: "#15130F" },
  { id: "sunset", label: "Sunset", accent: "#FF6B4A", bg: "#1F140F" },
  { id: "aurora", label: "Aurora", accent: "#4AFFC3", bg: "#0F1615" },
  { id: "minimal", label: "Minimal", accent: "#F5EFE4", bg: "#15130F" },
];

interface SpaceThemeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (theme: SpaceTheme) => void;
}

export function SpaceThemeEditor({ isOpen, onClose, onSaved }: SpaceThemeEditorProps) {
  const [theme, setTheme] = useState<SpaceTheme | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      spaceThemeApi.getMySpaceTheme().then(setTheme);
    }
  }, [isOpen]);

  const applyPreset = async (presetId: SpaceTheme["preset"]) => {
    setIsSaving(true);
    try {
      const saved = await spaceThemeApi.updateMySpaceTheme({ preset: presetId });
      setTheme(saved);
      onSaved(saved);
    } catch {
      showToast("Couldn't apply that theme", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const updateCustom = async (patch: Partial<SpaceTheme>) => {
    if (!theme) return;
    const next = { ...theme, ...patch, preset: "custom" as const };
    setTheme(next);
    try {
      const saved = await spaceThemeApi.updateMySpaceTheme(patch);
      onSaved(saved);
    } catch {
      showToast("Couldn't save theme change", "error");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Space Theme">
      {!theme ? (
        <LoadingSpinner />
      ) : (
        <div className={styles.wrap}>
          <div className={styles.presetGrid}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={theme.preset === p.id ? styles.presetActive : styles.preset}
                style={{ background: p.bg }}
                onClick={() => applyPreset(p.id)}
                disabled={isSaving}
              >
                <span className={styles.presetDot} style={{ background: p.accent }} />
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Accent color</label>
            <input
              type="color"
              value={theme.accent_color}
              onChange={(e) => updateCustom({ accent_color: e.target.value })}
              className={styles.colorInput}
            />
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Background color</label>
            <input
              type="color"
              value={theme.background_color}
              onChange={(e) => updateCustom({ background_color: e.target.value, background_gradient: "" })}
              className={styles.colorInput}
            />
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Card style</label>
            <div className={styles.chipRow}>
              {(["rounded", "sharp", "outlined"] as const).map((s) => (
                <button
                  key={s}
                  className={theme.card_style === s ? styles.chipActive : styles.chip}
                  onClick={() => updateCustom({ card_style: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Font</label>
            <div className={styles.chipRow}>
              {(["default", "serif", "mono"] as const).map((f) => (
                <button
                  key={f}
                  className={theme.font_style === f ? styles.chipActive : styles.chip}
                  onClick={() => updateCustom({ font_style: f })}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Avatar frame</label>
            <div className={styles.chipRow}>
              {(["none", "ring", "glow", "dashed"] as const).map((f) => (
                <button
                  key={f}
                  className={theme.avatar_frame === f ? styles.chipActive : styles.chip}
                  onClick={() => updateCustom({ avatar_frame: f })}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.rowLabel}>
              <input
                type="checkbox"
                checked={theme.glow_effect}
                onChange={(e) => updateCustom({ glow_effect: e.target.checked })}
              />
              Subtle glow effect
            </label>
          </div>

          <Button onClick={onClose}>Done</Button>
        </div>
      )}
    </Modal>
  );
}
