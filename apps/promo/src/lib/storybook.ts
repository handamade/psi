/**
 * Single source of truth for Storybook cross-references.
 * In production Storybook is served same-origin at /storybook/ (see
 * tools/assemble-site.mjs); in dev it runs on its own port via `pnpm dev:web`.
 */
export const STORYBOOK_BASE = import.meta.env.DEV
  ? "http://localhost:6006/"
  : "/storybook/";

/** Docs page for a story title, e.g. "Components/Button" or "Icons/Gallery". */
export function storybookDocs(title: string): string {
  const id = title
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${STORYBOOK_BASE}?path=/docs/${id}--docs`;
}

export const REPO_URL = "https://github.com/handamade/s-ds-claude";
