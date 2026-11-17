import type { ComponentType } from "react";

/** The homepage showcase, Canopy: one app built only from Psi, outside the
 * per-component examples. Shown framed, since it brings its own landmarks.
 *
 * Its own module, not part of registry.ts: the registry eagerly globs every docs
 * example, and the homepage and the Canopy frame would ship all of them to
 * render this one. */
const showcase = import.meta.glob<{ default: ComponentType }>("../../../../packages/docs/showcase/canopy.tsx", { eager: true });
const showcaseSource = import.meta.glob<string>("../../../../packages/docs/showcase/canopy.tsx", {
  eager: true,
  query: "?raw",
  import: "default",
});
const showcaseKey = Object.keys(showcase)[0];
export const canopy = { Component: showcase[showcaseKey].default, source: showcaseSource[showcaseKey] };
