import { writeFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPatterns, validatePatterns, renderPreset } from "./patterns.js";
import type { ManifestComponent } from "./patterns.js";

/** Reads `dist/manifest.json` + `src/contracts.json`, loads+validates the
 * patterns in `patterns/` (D48 — throws on any violation, a build gate),
 * prints the gap backlog as a report (never fatal — D48 posture: gaps are
 * expected, not errors), and writes `dist/patterns.json`. */
export function emitPatterns(rootDir: string): void {
  const manifest = JSON.parse(readFileSync(join(rootDir, "dist", "manifest.json"), "utf8")) as {
    components: ManifestComponent[];
  };
  const contracts = JSON.parse(readFileSync(join(rootDir, "src", "contracts.json"), "utf8")) as Record<
    string,
    string[]
  >;
  const patterns = loadPatterns(join(rootDir, "patterns"));

  // The icon roster is the resolution target for `requires` entries of
  // kind "icon" (D71). Read from the source directory rather than the barrel
  // so a file that exists but was never exported still fails to resolve.
  const icons = readdirSync(join(rootDir, "src", "icons"))
    .filter((f) => f.startsWith("Icon") && f.endsWith(".tsx"))
    .map((f) => f.replace(/\.tsx$/, ""));

  const { gaps } = validatePatterns(patterns, manifest.components, contracts, icons);

  for (const id of Object.keys(gaps).sort()) {
    console.log(`  pattern gaps (backlog): ${id} → ${gaps[id].join(", ")}`);
  }

  // D71's residual-risk mitigation: `requires` catches a placeholder its
  // author declared, and nothing can catch one they did not. Listing every
  // bracketed content value makes a new silent placeholder visible in CI
  // output instead of invisible. Non-fatal by the D48 posture — most of these
  // are consumer copy ("[record title]") and correct.
  const placeholders = patterns.flatMap((p) =>
    Object.entries(p.content)
      .filter(([, v]) => typeof v === "string" && /^\[.*\]$/.test(v))
      .map(([k]) => `${p.id}.${k}`),
  );
  console.log(`  pattern content placeholders: ${placeholders.length} (${placeholders.join(", ")})`);

  const sorted = [...patterns].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const output = {
    patterns: sorted.map((pattern) => {
      // Authored compose-tree gaps plus unmet `requires` (D71).
      const patternGaps = gaps[pattern.id] ?? [];
      const blocked = patternGaps.length > 0;
      return {
        id: pattern.id,
        intent: pattern.intent,
        match: pattern.match,
        compose: pattern.compose,
        parameters: pattern.parameters,
        content: pattern.content,
        gaps: patternGaps,
        blocked,
        preset: blocked ? null : renderPreset(pattern, manifest.components),
      };
    }),
  };

  writeFileSync(join(rootDir, "dist", "patterns.json"), JSON.stringify(output, null, 2) + "\n");
  console.log(`[react] wrote dist/patterns.json (${sorted.length} patterns)`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  emitPatterns(root);
}
