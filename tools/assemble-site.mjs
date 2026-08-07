// Assembles the public website: promo at /, static Storybook at /storybook/.
// Run after `pnpm -r build` (see root `build:web` script).
import { cp, rm, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "..");

const promoDist = path.join(repo, "apps/promo/dist");
const storybookDist = path.join(repo, "apps/storybook/storybook-static");
const out = path.join(repo, "site-dist");

for (const dir of [promoDist, storybookDist]) {
  try {
    await access(dir);
  } catch {
    console.error(`Missing build output: ${dir} — run \`pnpm -r build\` first.`);
    process.exit(1);
  }
}

await rm(out, { recursive: true, force: true });
await cp(promoDist, out, { recursive: true });
await cp(storybookDist, path.join(out, "storybook"), { recursive: true });

// §04 (Pipeline.tsx ARTIFACTS) advertises "llms.txt" unqualified — the root
// file, which is the machine-readable trail's entry point. Serve exactly
// that at the URL the page's claim implies. The two package-level llms.txt
// files are not named on the page, so copying them under invented names
// (`tokens-llms.txt`, `react-llms.txt`) would serve an artifact the site
// never promised, not fulfill one it did (D74).
await cp(path.join(repo, "llms.txt"), path.join(out, "llms.txt"));

console.log(`site-dist assembled: / (promo) + /storybook/ (${out}) + /llms.txt`);
