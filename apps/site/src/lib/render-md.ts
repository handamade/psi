import { Marked, Renderer } from "marked";

const defaults = new Renderer();

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The generated docs write element names in prose ("a <button>", "<li> items"),
// outside code spans. Markdown would pass those through as real tags and leave
// them unclosed, swallowing the rest of the page — so raw HTML is shown as text.
function makeMarked(label: string) {
  let n = 0;
  return new Marked({
    gfm: true,
    renderer: {
      html({ text }) {
        return escapeHtml(text);
      },
      // A wide table scrolls inside its own keyboard-reachable region, as the
      // props tables do (ScrollRegion.astro). Region names must be unique on
      // the page, so a second table in one source is numbered.
      table(token) {
        n += 1;
        const name = n === 1 ? label : `${label} ${n}`;
        return `<div class="docs-scroll" role="region" aria-label="${escapeHtml(name)}" tabindex="0">${defaults.table.call(this, token)}</div>`;
      },
    },
  });
}

/** Renders a section of a generated doc (keyboard table, theming note).
 * `label` names any table's scroll region; it must differ per call on a page.
 * The input is our own build output, not user content. */
export function mdToHtml(src: string, label = "Table"): string {
  return makeMarked(label).parse(src, { async: false }) as string;
}
