import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";

const require = createRequire(import.meta.url);

/**
 * Exposes the package's own generated artifacts to the site as `virtual:psi-facts`.
 *
 * D74: the site stated "18 components" for six releases because the numbers were
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
          "psi-facts: manifest.json has no icon roster — rebuild @handamade/psi-react (D74 Task 1)",
        );
      }

      const facts = {
        componentCount: manifest.components.length,
        iconCount: manifest.icons.length,
        patternCount: patterns.patterns.length,
        version: pkg.version,
        componentNames: manifest.components.map((c) => c.name),
        iconNames: manifest.icons,
      };

      return Object.entries(facts)
        .map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
        .join("\n");
    },
  };
}
