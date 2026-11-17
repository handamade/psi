import type { UpdateEntry } from "../content/updates";

const SITE = "https://psi.kurkin.de";

/** The changelog's markdown twin: one heading per update, newest first. */
export function changelogMd(entries: UpdateEntry[]): string {
  const parts = ["# Changelog", "", "Every Psi release, newest first."];
  for (const e of entries) {
    parts.push("", `## ${e.title}`, "", `${e.date} · ${e.tag}`, "", e.body);
    if (e.link) {
      const href = e.link.href.startsWith("/") ? `${SITE}${e.link.href}` : e.link.href;
      parts.push("", `[${e.link.label}](${href})`);
    }
  }
  return parts.join("\n") + "\n";
}

/** The heading anchor for an entry: a release's version ("0-34-0"), or a slug of the
 * whole title, so titles that share a first word still get distinct anchors. */
export function entryAnchor(title: string): string {
  const version = /^(\d+\.\d+\.\d+)\b/.exec(title);
  const source = version ? version[1] : title;
  return source
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
