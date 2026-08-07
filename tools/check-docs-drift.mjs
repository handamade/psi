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

const claims = [
  ["README.md", /(\d+) React 19 components/, nc],
  ["packages/react/README.md", /(\d+) React 19 components/, nc],
  ["packages/react/llms.txt", /(\d+) React 19 components/, nc],
  ["packages/mcp/README.md", /(\d+) React 19 components/, nc],
  ["packages/react/llms.txt", /(\d+) composition patterns/, np],
  ["packages/mcp/README.md", /(\d+) composition patterns/, np],
  ["packages/mcp/llms.txt", /(\d+) composition patterns/, np],
  // D74: the public site is a prose artifact too. It stated "18 components"
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
];

let failed = false;
for (const [file, re, expected, mode] of claims) {
  const text = await readFile(file, "utf8");
  const m = text.match(re);
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
