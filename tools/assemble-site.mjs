// Assembles the public website: promo at /, static Storybook at /storybook/.
// Run after `pnpm -r build` (see root `build:web` script).
import { cp, rm, access, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "..");

const promoDist = path.join(repo, "apps/promo/dist");
const storybookDist = path.join(repo, "apps/storybook/storybook-static");
const rootLlmsTxt = path.join(repo, "llms.txt");
const tokensLlmsTxt = path.join(repo, "packages/tokens/llms.txt");
const reactLlmsTxt = path.join(repo, "packages/react/llms.txt");
const out = path.join(repo, "site-dist");

for (const dir of [promoDist, storybookDist]) {
  try {
    await access(dir);
  } catch {
    console.error(`Missing build output: ${dir} — run \`pnpm -r build\` first.`);
    process.exit(1);
  }
}

for (const file of [rootLlmsTxt, tokensLlmsTxt, reactLlmsTxt]) {
  try {
    await access(file);
  } catch {
    console.error(`Missing ${file} — run \`pnpm build\` first.`);
    process.exit(1);
  }
}

await rm(out, { recursive: true, force: true });
await cp(promoDist, out, { recursive: true });
await cp(storybookDist, path.join(out, "storybook"), { recursive: true });

// §04 (Pipeline.tsx ARTIFACTS) advertises "llms.txt" unqualified — the root
// file, which is the machine-readable trail's entry point. Serve exactly
// that at the URL the page's claim implies. The root file's own first
// content line then points readers at `packages/tokens/llms.txt` and
// `packages/react/llms.txt` — so serve those too, at exactly the
// repo-relative paths the root file already names. That invents no new
// artifact (unlike the brief's `tokens-llms.txt` / `react-llms.txt`,
// rejected in Task 10): it preserves the paths the served file promises (D76).
await cp(rootLlmsTxt, path.join(out, "llms.txt"));
await mkdir(path.join(out, "packages/tokens"), { recursive: true });
await mkdir(path.join(out, "packages/react"), { recursive: true });
await cp(tokensLlmsTxt, path.join(out, "packages/tokens/llms.txt"));
await cp(reactLlmsTxt, path.join(out, "packages/react/llms.txt"));

console.log(
  `site-dist assembled: / (promo) + /storybook/ + /llms.txt + /packages/tokens/llms.txt + /packages/react/llms.txt (${out})`,
);
