import { useCallback, useEffect, useState } from "react";
import { isBrandVector, type BrandVector } from "@handamade/psi-tokens/generate";

export const MODE_KEY = "psi-theme";
export const BRAND_KEY = "psi-brand";

export type Mode = "light" | "dark";

export interface StoredBrand {
  vector: BrandVector;
  /** Resolved custom properties for the vector's own mode, so the boot script
   * can paint before `generate/` is available. Rewritten whenever it drifts. */
  cache: Record<string, string>;
}

function isMode(value: unknown): value is Mode {
  return value === "light" || value === "dark";
}

/** Null means "nothing usable stored" — the caller falls back to the OS.
 * A stale "acme"/"ember" from the old roster lands here rather than being
 * written to data-psi-theme, where it would strand the visitor. */
export function readStoredMode(): Mode | null {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    return isMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Self-healing: anything that fails validation is cleared, not kept. */
export function readStoredBrand(): StoredBrand | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(BRAND_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    const parsed = JSON.parse(raw) as { vector?: unknown; cache?: unknown };
    if (!isBrandVector(parsed.vector)) throw new Error("invalid vector");
    const cache =
      typeof parsed.cache === "object" && parsed.cache !== null
        ? (parsed.cache as Record<string, string>)
        : {};
    return { vector: parsed.vector, cache };
  } catch {
    try {
      localStorage.removeItem(BRAND_KEY);
    } catch {
      /* storage unavailable */
    }
    return null;
  }
}

function systemMode(): Mode {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Mode state, synced to <html data-psi-theme>. */
export function useMode(): [Mode, (next: Mode) => void] {
  const [mode, setModeState] = useState<Mode>(() => readStoredMode() ?? systemMode());

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    document.documentElement.dataset.psiTheme = next;
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  return [mode, setMode];
}

/** Brand state. Orthogonal to mode: reset clears this and never touches that. */
export function useBrand(): {
  brand: BrandVector | null;
  setBrand: (v: BrandVector, cache: Record<string, string>) => void;
  reset: () => void;
} {
  const [brand, setBrandState] = useState<BrandVector | null>(
    () => readStoredBrand()?.vector ?? null,
  );

  const setBrand = useCallback((v: BrandVector, cache: Record<string, string>) => {
    setBrandState(v);
    try {
      localStorage.setItem(BRAND_KEY, JSON.stringify({ vector: v, cache }));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const reset = useCallback(() => {
    setBrandState(null);
    try {
      localStorage.removeItem(BRAND_KEY);
    } catch {
      /* storage unavailable */
    }
    const style = document.documentElement.style;
    for (const name of Array.from(style).filter((n) => n.startsWith("--psi-"))) {
      style.removeProperty(name);
    }
    delete document.documentElement.dataset.psiCustom;
  }, []);

  return { brand, setBrand, reset };
}

/** Apply a derived member's properties to <html>. */
export function applyCustomProperties(props: Record<string, string>): void {
  const style = document.documentElement.style;
  for (const [name, value] of Object.entries(props)) {
    style.setProperty(name, value);
  }
  document.documentElement.dataset.psiCustom = "";
}

/** Keep `system`-less mode honest: with nothing stored, follow the OS live. */
export function useSystemModeSync(setMode: (m: Mode) => void): void {
  useEffect(() => {
    if (readStoredMode() !== null) return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStoredMode() === null) {
        document.documentElement.dataset.psiTheme = mq.matches ? "dark" : "light";
        setMode(mq.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setMode]);
}

// --- Compatibility layer for pre-D57 consumers -----------------------------
//
// Task 9 rewrites Header.tsx and App.tsx to the Mode/Brand API above and
// drops this section entirely. Until then, Header.tsx, Theming.tsx and
// App.tsx still import THEMES / ThemeName / useTheme, so those stay here,
// unchanged from before this task, purely to keep `pnpm --dir apps/promo
// build` green.

export const THEMES = ["light", "dark", "acme", "ember"] as const;
export type ThemeName = (typeof THEMES)[number];

function isTheme(value: string | undefined): value is ThemeName {
  return (THEMES as readonly string[]).includes(value ?? "");
}

/** @deprecated pre-D57 compatibility shim — removed when Task 9 rewrites App/Header. */
export function useTheme(): [ThemeName, (theme: ThemeName) => void] {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const current = document.documentElement.dataset.psiTheme;
    return isTheme(current) ? current : "light";
  });

  const setTheme = (next: ThemeName) => {
    setThemeState(next);
    document.documentElement.dataset.psiTheme = next;
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };

  return [theme, setTheme];
}
