/**
 * The decision numbers the specs claim (D133).
 *
 * A decision section is any `## ` heading starting with "Decision" (Decisions,
 * Decision log, Decision log additions, Decisions & non-goals), plus a
 * `## ... (D<n>)` heading, which claims that one number. Inside a decision
 * section an entry opens as `- **D<n>`, `### D<n>` / `#### D<n>`, or, in the
 * original design-system log, a table row `| <n> |`. A number merely mentioned
 * or reserved in prose is not a decision (CLAUDE.md, the D61 case).
 */
export function countDecisions(texts: string[]): number {
  const found = new Set<number>();
  for (const text of texts) {
    for (const part of text.split(/^(?=## )/m)) {
      const heading = part.match(/^## (.*)$/m)?.[1];
      if (heading === undefined || !part.startsWith("## ")) continue;
      const claimed = heading.match(/\(D(\d+)\)\s*$/);
      if (claimed) found.add(Number(claimed[1]));
      if (!/^Decision/.test(heading)) continue;
      for (const m of part.matchAll(/^(?:\s*-\s+\*\*|#{3,4}\s+)D(\d+)(?=[\s.*—:–-]|$)/gm)) found.add(Number(m[1]));
      for (const m of part.matchAll(/^\|\s*(\d+)\s*\|/gm)) found.add(Number(m[1]));
    }
  }
  return found.size;
}
