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

console.log(`site-dist assembled: / (promo) + /storybook/ (${out})`);
