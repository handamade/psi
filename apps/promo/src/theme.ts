import { useState } from "react";

export const THEMES = ["light", "dark", "acme"] as const;
export type ThemeName = (typeof THEMES)[number];

function isTheme(value: string | undefined): value is ThemeName {
  return (THEMES as readonly string[]).includes(value ?? "");
}

/** Theme state synced to <html data-ds-theme> — the DS theming contract. */
export function useTheme(): [ThemeName, (theme: ThemeName) => void] {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const current = document.documentElement.dataset.dsTheme;
    return isTheme(current) ? current : "light";
  });

  const setTheme = (next: ThemeName) => {
    setThemeState(next);
    document.documentElement.dataset.dsTheme = next;
    try {
      localStorage.setItem("ds-theme", next);
    } catch {
      /* storage unavailable */
    }
  };

  return [theme, setTheme];
}
