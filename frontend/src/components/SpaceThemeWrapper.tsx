import type { CSSProperties, ReactNode } from "react";
import type { SpaceTheme } from "../services/spaceTheme";

const FONT_MAP: Record<string, string> = {
  default: "'Sora', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
};

export function SpaceThemeWrapper({ theme, children }: { theme: SpaceTheme | null; children: ReactNode }) {
  if (!theme) return <>{children}</>;

  // CSS custom properties cascade to every descendant that reads var(--color-coral) etc.,
  // so overriding them here re-themes Buttons/Avatars/ProfileHeader without touching their code.
  const style: CSSProperties & Record<string, string> = {
    "--color-coral": theme.accent_color,
    "--color-coral-soft": `${theme.accent_color}24`,
    "--font-display": FONT_MAP[theme.font_style] || FONT_MAP.default,
    background: theme.background_gradient || theme.background_color,
    borderRadius: "inherit",
  };

  if (theme.glow_effect) {
    style.boxShadow = `inset 0 0 120px ${theme.accent_color}22`;
  }

  return <div style={style}>{children}</div>;
}
