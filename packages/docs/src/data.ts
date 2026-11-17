import type { ColorToken, Oklch, Resolved, ThemeName } from "./types.js";

export const THEMES: ThemeName[] = ["light", "dark", "acme", "ember"];

export function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function docSection(md: string, heading: string): string | null {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

/** Plain-text summary of an export's description, for meta descriptions and
 * llms.txt: markdown marks stripped, the first complete sentence, or the first
 * two when that one is too short or only says what the component is not. A
 * sentence ends at ". " followed by a letter, never at "e.g." or "i.e.". */
export function summary(description: string): string {
  const plain = description.replace(/[`*_]{1,2}/g, "").replace(/\s+/g, " ").trim();
  const sentences = plain.split(/(?<!\be\.g|\bi\.e|\bvs|\betc)(?<=[.!?])\s+(?=[A-Za-z])/);
  let out = sentences[0];
  if ((out.length < 40 || out.startsWith("Not ")) && sentences.length > 1) {
    out = `${out} ${sentences[1]}`;
  }
  return out.replace(/[.!?]+$/, "") + ".";
}

export function formatOklch(o: Oklch): string {
  const base = `oklch(${o.l} ${o.c} ${o.h}`;
  return o.alpha != null ? `${base} / ${o.alpha})` : `${base})`;
}

export function colorTokens(resolvedByTheme: Record<ThemeName, Resolved>): ColorToken[] {
  return Object.values(resolvedByTheme.light.tokens).map((t) => ({
    name: t.name,
    cssVar: `--psi-${kebab(t.name)}`,
    formula: t.formula,
    byTheme: Object.fromEntries(
      THEMES.map((th) => {
        const v = resolvedByTheme[th].tokens[t.name];
        return [th, { hex: v.hex, oklch: formatOklch(v.oklch) }];
      }),
    ) as ColorToken["byTheme"],
  }));
}
