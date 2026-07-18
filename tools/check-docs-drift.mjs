// Guards hand-written prose against the generated component inventory:
// README counts must match manifest.json (Station 6 of the 2026-07-15
// inspection — the "8 components" drift survived two full cycles).
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(
  await readFile("packages/react/dist/manifest.json", "utf8"),
);
const n = manifest.components.length;

const claims = [
  ["README.md", /(\d+) React 19 components/],
  ["packages/react/README.md", /(\d+) React 19 components/],
  ["packages/react/llms.txt", /(\d+) React 19 components/],
  ["packages/mcp/README.md", /(\d+) React 19 components/],
];

let failed = false;
for (const [file, re] of claims) {
  const text = await readFile(file, "utf8");
  const m = text.match(re);
  if (!m) {
    console.error(`DRIFT: ${file} has no "<n> React 19 components" claim`);
    failed = true;
  } else if (Number(m[1]) !== n) {
    console.error(`DRIFT: ${file} claims ${m[1]} components, manifest has ${n}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`docs drift check passed: ${n} components stated consistently`);
