import { Marked } from "marked";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The generated docs write element names in prose ("a <button>", "<li> items"),
// outside code spans. Markdown would pass those through as real tags and leave
// them unclosed, swallowing the rest of the page — so raw HTML is shown as text.
const md = new Marked({
  gfm: true,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
  },
});

/** Renders a section of a generated doc (keyboard table, theming note).
 * The input is our own build output, not user content. */
export function mdToHtml(src: string): string {
  return md.parse(src, { async: false }) as string;
}
