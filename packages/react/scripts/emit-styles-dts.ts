import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Emits `dist/styles.d.ts` so the documented stylesheet import typechecks.
 *
 * Found by the external consumer run (D68), not by anything in this repo — the
 * workspace never exercises the published `exports` map, which is the whole
 * reason that run exists.
 *
 * The bug: every doc tells consumers to write
 *
 *     import "@handamade/psi-react/styles";
 *
 * and in a standard TypeScript + Vite consumer that is an error —
 * `TS2882: Cannot find module or type declarations for side-effect import`.
 * `vite/client` declares `*.css`, which covers the four
 * `@handamade/psi-tokens/*.css` imports, but `./styles` has no `.css`
 * extension so the glob does not match it, and the export had no `types`
 * condition to fall back on. The undocumented `./styles.css` spelling worked;
 * the documented one did not.
 *
 * The file is intentionally empty: a side-effect-only CSS module has no
 * exports. Its mere existence, pointed at by the `types` condition on the
 * `./styles` export, is what satisfies the compiler.
 *
 * Emitted rather than tracked because everything else under dist/ is
 * generated, and a hand-maintained file there would be the one thing a
 * `rm -rf dist` did not restore. */
const root = fileURLToPath(new URL("..", import.meta.url));

writeFileSync(
  join(root, "dist", "styles.d.ts"),
  "// Side-effect-only stylesheet: no exports. See scripts/emit-styles-dts.ts.\n",
);

console.log("[react] wrote dist/styles.d.ts");
