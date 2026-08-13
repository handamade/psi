/**
 * Enumerate the subpaths a consumer can actually import from a package's
 * published `exports` map.
 *
 * Extracted from `verify-published.mjs` so it can be tested without running
 * that script, which installs real tarballs from npm and takes a minute. The
 * script itself has no `isMain` guard — importing it runs the whole
 * verification — so the testable logic lives here instead of being exported
 * from there.
 *
 * Pure by design: it takes an already-parsed package.json rather than a path,
 * so a test can hand it a literal.
 */

/**
 * @param {string} pkg  package name, e.g. "@handamade/psi-tokens"
 * @param {{exports?: unknown}} pkgJson  the package's parsed package.json
 * @returns {string[]} importable specifiers, e.g. ["@handamade/psi-tokens/generate"]
 *
 * Wildcard patterns (`./*.css`, `./components/*`) are skipped deliberately:
 * a pattern cannot be enumerated from the map alone — you would have to walk
 * the tarball to know what it matches. Callers cover those with an explicit
 * list of the specifiers their docs prescribe.
 *
 * A `"."` key maps to the bare package name, which is how a consumer writes it.
 */
export function concreteSubpaths(pkg, pkgJson) {
  const map = pkgJson?.exports;
  if (!map || typeof map !== "object" || Array.isArray(map)) return [];
  return Object.keys(map)
    .filter((key) => key.startsWith(".") && !key.includes("*"))
    .map((key) => (key === "." ? pkg : `${pkg}${key.slice(1)}`));
}
