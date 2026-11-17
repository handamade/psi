import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { isBrandVector, type BrandVector } from "@handamade/psi-tokens/generate";

export const MODE_KEY = "psi-theme";
export const BRAND_KEY = "psi-brand";

export type Mode = "light" | "dark";

export interface StoredBrand {
  vector: BrandVector;
  /** Resolved custom properties for the mode the page was painted in, so the
   * boot script can paint before `generate/` is available. Rewritten whenever
   * it drifts, and on every mode change. */
  cache: Record<string, string>;
  /** The mode `cache` was resolved for. A page that paints a fixed mode (the
   * Canopy frame) applies the cache only when this matches, and derives the
   * other member itself. Absent in brands stored before it was recorded. */
  mode?: Mode;
}

function isMode(value: unknown): value is Mode {
  return value === "light" || value === "dark";
}

/** Remove every inline --psi-* property the boot script or console applied.
 * Shared by readStoredBrand's rejection path and useBrand's reset — both
 * need to erase the same paint, for the same reason. */
export function clearAppliedTheme(): void {
  const style = document.documentElement.style;
  for (const name of Array.from(style).filter((n) => n.startsWith("--psi-"))) {
    style.removeProperty(name);
  }
  delete document.documentElement.dataset.psiCustom;
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
    const mode = (parsed as { mode?: unknown }).mode;
    return isMode(mode) ? { vector: parsed.vector, cache, mode } : { vector: parsed.vector, cache };
  } catch {
    try {
      localStorage.removeItem(BRAND_KEY);
    } catch {
      /* storage unavailable */
    }
    // The boot script may already have painted this rejected vector's cache
    // onto <html> before any module — including this validator — could run.
    // Clearing the key alone leaves that paint on screen, with the reset
    // control living inside the very theme being rejected. Strip it too.
    clearAppliedTheme();
    return null;
  }
}

function systemMode(): Mode {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Fired on `window` whenever a mode is painted, so every hook instance in
 * the document (the chrome's, the homepage's, later the theme console's)
 * follows a change made by any other. `detail` is the new mode. */
export const MODE_EVENT = "psi-site:mode";

function applyMode(next: Mode): void {
  document.documentElement.dataset.psiTheme = next;
  window.dispatchEvent(new CustomEvent<Mode>(MODE_EVENT, { detail: next }));
}

/** Follow modes painted by other instances. Callers persist BEFORE applying,
 * so a listener that re-reads storage sees the new preference. */
function useModeEvents(onMode: (mode: Mode) => void): void {
  useEffect(() => {
    const on = (e: Event) => onMode((e as CustomEvent<Mode>).detail);
    window.addEventListener(MODE_EVENT, on);
    return () => window.removeEventListener(MODE_EVENT, on);
  }, [onMode]);
}

export type ModePref = Mode | "system";

/**
 * What a mode control shows as selected. Normally the preference; but a derived
 * brand paints its own mode without persisting it, and then the preference no
 * longer describes the page: "Light" selected over a dark page. While the painted
 * mode differs from the one the preference would paint, the control shows the
 * painted mode. `system` is the OS mode.
 */
export function shownPref(pref: ModePref, mode: Mode, system: Mode): ModePref {
  const expected = pref === "system" ? system : pref;
  return expected === mode ? pref : mode;
}

/**
 * The visitor's preference, with "system" as a real choice (D133): picking it
 * removes the stored mode, so the OS-follow listener in this hook takes over
 * again. `mode` is what is painted. setModeEphemeral is for a derived brand's own
 * mode (never persisted). Following the OS lives in this hook and is not
 * persisted either: it is not a choice.
 */
export function useModePref(): [ModePref, Mode, (p: ModePref) => void, (m: Mode) => void, ModePref] {
  const [pref, setPrefState] = useState<ModePref>("system");
  const [mode, setModeState] = useState<Mode>("light");
  // The OS mode, for shownPref. Null on the server and the first client render,
  // so both agree; read before paint.
  const [system, setSystem] = useState<Mode | null>(null);
  useLayoutEffect(() => {
    const stored = readStoredMode();
    const os = systemMode();
    setSystem(os);
    setPrefState(stored ?? "system");
    setModeState(stored ?? os);
  }, []);

  const setPref = useCallback((p: ModePref) => {
    setPrefState(p);
    const next = p === "system" ? systemMode() : p;
    setModeState(next);
    try {
      if (p === "system") localStorage.removeItem(MODE_KEY);
      else localStorage.setItem(MODE_KEY, p);
    } catch {
      /* storage unavailable */
    }
    applyMode(next);
  }, []);

  // Another instance changed the mode: follow it, and re-read the preference
  // it stored (or cleared).
  const followOther = useCallback((m: Mode) => {
    setModeState(m);
    setPrefState(readStoredMode() ?? "system");
  }, []);
  useModeEvents(followOther);

  const setModeEphemeral = useCallback((m: Mode) => {
    setModeState(m);
    applyMode(m);
  }, []);

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next: Mode = mq.matches ? "dark" : "light";
      setSystem(next);
      if (readStoredMode() !== null) return;
      setModeState(next);
      applyMode(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return [pref, mode, setPref, setModeEphemeral, shownPref(pref, mode, system ?? mode)];
}

/** Brand state. Orthogonal to mode: reset clears this and never touches that. */
export function useBrand(): {
  brand: BrandVector | null;
  setBrand: (v: BrandVector, cache: Record<string, string>, mode?: Mode) => void;
  reset: () => void;
} {
  // Same reason as useModePref: null on the server and on the first client
  // render, the stored vector before paint.
  const [brand, setBrandState] = useState<BrandVector | null>(null);
  useLayoutEffect(() => {
    setBrandState(readStoredBrand()?.vector ?? null);
  }, []);

  const setBrand = useCallback((v: BrandVector, cache: Record<string, string>, mode?: Mode) => {
    setBrandState(v);
    try {
      localStorage.setItem(BRAND_KEY, JSON.stringify(mode ? { vector: v, cache, mode } : { vector: v, cache }));
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
    clearAppliedTheme();
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
