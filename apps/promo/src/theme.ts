import { useState } from "react";

export const THEMES = ["light", "dark", "acme"] as const;
export type ThemeName = (typeof THEMES)[number];

function isTheme(value: string | undefined): value is ThemeName {
  return (THEMES as readonly string[]).includes(value ?? "");
}

/** Theme state synced to <html data-psi-theme> — the Psi theming contract. */
export function useTheme(): [ThemeName, (theme: ThemeName) => void] {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const current = document.documentElement.dataset.psiTheme;
    return isTheme(current) ? current : "light";
  });

  const setTheme = (next: ThemeName) => {
    setThemeState(next);
    document.documentElement.dataset.psiTheme = next;
    try {
      localStorage.setItem("psi-theme", next);
    } catch {
      /* storage unavailable */
    }
  };

  return [theme, setTheme];
}
