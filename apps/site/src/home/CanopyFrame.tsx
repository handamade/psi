import { useEffect } from "react";
import { deriveTheme } from "@handamade/psi-tokens/generate";

import { canopy } from "../examples/canopy";
import { applyCustomProperties, BRAND_KEY, clearAppliedTheme, readStoredBrand } from "../theme";

export const FRAME_THEMES = ["light", "dark", "acme", "ember"] as const;
export type FrameTheme = (typeof FRAME_THEMES)[number];

/** The frame's theme comes from `?theme=` alone. Anything else is dark, the
 * homepage's default, never the visitor's own mode. */
export function frameTheme(search: string): FrameTheme {
  const t = new URLSearchParams(search).get("theme");
  return (FRAME_THEMES as readonly string[]).includes(t ?? "") ? (t as FrameTheme) : "dark";
}

/**
 * Paint the stored brand's member for the frame's own mode. The stored cache
 * holds the properties of whichever mode the homepage was painted in, so it
 * cannot serve both segments: a light cache in the dark segment paints a light
 * body. Derive the pair from the vector and take this mode's member. acme and
 * ember don't take a brand.
 */
export function paintFrameBrand(theme: FrameTheme): void {
  clearAppliedTheme();
  if (theme !== "light" && theme !== "dark") return;
  const stored = readStoredBrand();
  if (!stored) return;
  try {
    applyCustomProperties(deriveTheme(stored.vector)[theme].customProperties);
  } catch {
    /* a vector that no longer derives: the stock theme stands */
  }
}

/** Canopy on its own page, for the homepage's iframe. */
export function CanopyFrame() {
  useEffect(() => {
    const theme = frameTheme(location.search);
    paintFrameBrand(theme);
    // The homepage writes the brand while this frame is open.
    const onStorage = (e: StorageEvent) => {
      if (e.key === BRAND_KEY || e.key === null) paintFrameBrand(theme);
    };
    addEventListener("storage", onStorage);
    return () => removeEventListener("storage", onStorage);
  }, []);
  const { Component } = canopy;
  return <Component />;
}
