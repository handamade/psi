import { writeFileSync, readFileSync } from "node:fs";
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

  const { gaps } = validatePatterns(patterns, manifest.components, contracts);

  for (const id of Object.keys(gaps).sort()) {
    console.log(`  pattern gaps (backlog): ${id} → ${gaps[id].join(", ")}`);
  }

  const sorted = [...patterns].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const output = {
    patterns: sorted.map((pattern) => {
      const blocked = pattern.gaps.length > 0;
      return {
        id: pattern.id,
        intent: pattern.intent,
        match: pattern.match,
        compose: pattern.compose,
        parameters: pattern.parameters,
        content: pattern.content,
        gaps: pattern.gaps,
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
