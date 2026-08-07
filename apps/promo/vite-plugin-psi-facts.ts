import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";

const require = createRequire(import.meta.url);

/**
 * Reads each component's Storybook `title:` straight from its
 * `<Component>/<Component>.stories.tsx`, keyed by component name. A
 * component with no story file simply gets no entry — this is what lets
 * consumers drop a hand-maintained denylist of compound members (D76
 * review: three of 21 links 404'd because they'd been hardcoded as
 * `Components/${name}`, but Table/Pagination live under `Data/` and Toast
 * under `Feedback/`).
 */
function readStoryTitles(
  pkgRoot: string,
  componentNames: readonly string[],
): Record<string, string> {
  const srcDir = join(pkgRoot, "src");
  const titles: Record<string, string> = {};

  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !componentNames.includes(entry.name)) continue;

    const dir = join(srcDir, entry.name);
    const storyFile = readdirSync(dir).find((f) => f.endsWith(".stories.tsx"));
    if (!storyFile) continue;

    const text = readFileSync(join(dir, storyFile), "utf8");
    const match = text.match(/title:\s*["'`]([^"'`]+)["'`]/);
    if (match) titles[entry.name] = match[1];
  }

  return titles;
}

/**
 * Exposes the package's own generated artifacts to the site as `virtual:psi-facts`.
 *
 * D76: the site stated "18 components" for six releases because the numbers were
 * typed. They are now read from manifest.json at config time — a wrong count is
 * no longer expressible. Only the resolved values reach the bundle; the 57KB
 * manifest does not.
 */
export function psiFacts(): Plugin {
  const VIRTUAL = "virtual:psi-facts";
  const RESOLVED = "\0" + VIRTUAL;

  return {
    name: "psi-facts",
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : null),
    load(id) {
      if (id !== RESOLVED) return null;

      const read = (spec: string) =>
        JSON.parse(readFileSync(require.resolve(spec), "utf8"));

      const manifestPath = require.resolve("@handamade/psi-react/manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        components: { name: string }[];
        icons: string[];
      };
      const patterns = read("@handamade/psi-react/patterns.json") as {
        patterns: unknown[];
      };

      // "./package.json" is not in @handamade/psi-react's exports map, so it
      // can't be resolved as a subpath. Derive its path from manifest.json's
      // instead: dist/manifest.json's parent's parent is the package root.
      const pkgPath = join(dirname(manifestPath), "..", "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        version: string;
      };

      if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
        throw new Error(
          "psi-facts: manifest.json has no icon roster — rebuild @handamade/psi-react (D76 Task 1)",
        );
      }

      const componentNames = manifest.components.map((c) => c.name);
      const pkgRoot = dirname(pkgPath);

      const facts = {
        componentCount: manifest.components.length,
        iconCount: manifest.icons.length,
        patternCount: patterns.patterns.length,
        version: pkg.version,
        componentNames,
        iconNames: manifest.icons,
        storyTitles: readStoryTitles(pkgRoot, componentNames),
      };

      return Object.entries(facts)
        .map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
        .join("\n");
    },
  };
}
