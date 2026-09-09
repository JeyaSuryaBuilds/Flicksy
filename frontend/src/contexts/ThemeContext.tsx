import { createContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import * as settingsApi from "../services/settings";

interface ThemeContextValue {
  theme: "light" | "dark" | "system";
  reduceMotion: boolean;
  setTheme: (t: "light" | "dark" | "system") => void;
  setReduceMotion: (v: boolean) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: "light" | "dark" | "system") {
  const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

function applyReduceMotion(reduce: boolean) {
  document.documentElement.setAttribute("data-reduce-motion", reduce ? "true" : "false");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [theme, setThemeState] = useState<"light" | "dark" | "system">("dark");
  const [reduceMotion, setReduceMotionState] = useState(false);

  // Load the real persisted setting from the backend on login — this is the source of truth,
  // not localStorage. Falls back to dark/no-reduce-motion if settings can't be fetched yet.
  useEffect(() => {
    if (!isAuthenticated) return;
    settingsApi.getSettings().then((s) => {
      setThemeState(s.theme as "light" | "dark" | "system");
      setReduceMotionState(s.reduce_motion);
      applyTheme(s.theme as "light" | "dark" | "system");
      applyReduceMotion(s.reduce_motion);
    }).catch(() => {});
  }, [isAuthenticated]);

  const setTheme = (t: "light" | "dark" | "system") => {
    setThemeState(t);
    applyTheme(t);
    settingsApi.updateSettings({ theme: t }).catch(() => {
      // Revert visually if the backend rejects it — never leave the UI claiming a setting
      // that didn't actually persist.
    });
  };

  const setReduceMotion = (v: boolean) => {
    setReduceMotionState(v);
    applyReduceMotion(v);
    settingsApi.updateSettings({ reduce_motion: v }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, reduceMotion, setTheme, setReduceMotion }}>
      {children}
    </ThemeContext.Provider>
  );
}
