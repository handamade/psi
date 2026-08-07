// Guards hand-written prose against the generated component/pattern
// inventories: README counts must match manifest.json / patterns.json
// (Station 6 of the 2026-07-15 inspection — the "8 components" drift
// survived two full cycles).
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(
  await readFile("packages/react/dist/manifest.json", "utf8"),
);
const nc = manifest.components.length;
const ni = manifest.icons.length;

const patterns = JSON.parse(
  await readFile("packages/react/dist/patterns.json", "utf8"),
);
const np = patterns.patterns.length;

const { version: pkgVersion } = JSON.parse(
  await readFile("packages/react/package.json", "utf8"),
);

const claims = [
  ["README.md", /(\d+) React 19 components/, nc],
  ["packages/react/README.md", /(\d+) React 19 components/, nc],
  ["packages/react/llms.txt", /(\d+) React 19 components/, nc],
  ["packages/mcp/README.md", /(\d+) React 19 components/, nc],
  ["packages/react/llms.txt", /(\d+) composition patterns/, np],
  ["packages/mcp/README.md", /(\d+) composition patterns/, np],
  ["packages/mcp/llms.txt", /(\d+) composition patterns/, np],
  // D76: the public site is a prose artifact too. It stated "18 components"
  // across six releases precisely because nothing here looked at apps/promo.
  // These entries are belt-and-braces over virtual:psi-facts — the plugin makes
  // a wrong number inexpressible, and this makes a reintroduced literal fail CI.
  // Mode "must-not-hardcode": the healthy source has no typed digit for the
  // regex to find (the count is a template-literal expression, not a
  // literal) — a missing match is the fix, not drift. A *present* match that
  // disagrees with the manifest still fails below: that is what catches a
  // reintroduced literal. Rows without this mode keep the original behavior,
  // where a missing match is itself DRIFT.
  ["apps/promo/src/sections/Hero.tsx", /(\d+) components/, nc, "must-not-hardcode"],
  ["apps/promo/src/sections/Hero.tsx", /(\d+) icons/, ni, "must-not-hardcode"],
  ["apps/promo/src/sections/Roadmap.tsx", /(\d+) components/, nc, "must-not-hardcode"],
  ["apps/promo/src/sections/Roadmap.tsx", /(\d+) icons/, ni, "must-not-hardcode"],
  // Playground.tsx carried the original defect ("Eighteen production
  // components" — a spelled-out word no /(\d+)/ regex would have caught) and
  // was not watched at all. It is now.
  ["apps/promo/src/sections/Playground.tsx", /(\d+) production components/, nc, "must-not-hardcode"],
  // D76 spec: "What stays hand-written (release notes) joins the
  // check-docs-drift claims list." UPDATES is entirely hand-written and is
  // the exact artifact that rotted for six releases (it said 0.8.0 while
  // main shipped 0.14.1). Entries are added at the top (see the file's own
  // header comment), so the first `title: "..."` match in the array literal
  // is the newest entry. Mode "version-string": extract a semver from that
  // title and compare it against package.json's version as a *string*, not
  // a number — versions aren't numeric and a numeric compare would silently
  // coerce "0.14.10" and "0.14.1" to the same NaN-safe falsy mismatch in
  // stranger ways than a plain string diff.
  [
    "apps/promo/src/content/updates.ts",
    /title:\s*"([^"]*)"/,
    pkgVersion,
    "version-string",
  ],
];

let failed = false;
for (const [file, re, expected, mode] of claims) {
  const text = await readFile(file, "utf8");
  const m = text.match(re);

  if (mode === "version-string") {
    if (!m) {
      console.error(`DRIFT: ${file} has no match for ${re}`);
      failed = true;
      continue;
    }
    const versionMatch = m[1].match(/\d+\.\d+\.\d+/);
    if (!versionMatch) {
      console.error(
        `DRIFT: ${file}'s newest UPDATES entry title ("${m[1]}") has no ` +
          `extractable version number, so it cannot be checked against ` +
          `packages/react/package.json (${expected}). Give the newest entry ` +
          `a title that leads with its version, e.g. "${expected} — ...".`,
      );
      failed = true;
      continue;
    }
    if (versionMatch[0] !== expected) {
      console.error(
        `DRIFT: ${file}'s newest UPDATES entry claims ${versionMatch[0]}, ` +
          `but packages/react/package.json is ${expected}. The release feed ` +
          `is behind the release — add (or fix) the entry for ${expected}.`,
      );
      failed = true;
    }
    continue;
  }

  if (!m) {
    if (mode === "must-not-hardcode") continue;
    console.error(`DRIFT: ${file} has no match for ${re}`);
    failed = true;
  } else if (Number(m[1]) !== expected) {
    console.error(`DRIFT: ${file} claims ${m[1]}, expected ${expected} (${re})`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`docs drift check passed: ${nc} components, ${np} patterns stated consistently`);
