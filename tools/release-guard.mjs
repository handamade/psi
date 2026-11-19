// Preflight for `pnpm release`: refuse unless we're releasing exactly what
// main ships. Exists because pnpm publish's own branch check is a soft prompt
// (answerable with "Y") and exits 0 on refusal, letting `changeset tag` run
// anyway — this guard is hard and runs before anything else.
//
// D144 adds two freshness checks: a refusal when EVAL_RELEASE_LIMIT or more
// releases have shipped since the newest generation-eval run, and a warning
// (never a refusal) when the Figma library's stamp trails the release by more
// than one minor. The logic lives in tools/lib/release-checks.mjs.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { evalFreshness, figmaWarning } from "./lib/release-checks.mjs";

const EVAL_RELEASE_LIMIT = 5;

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const fail = (msg) => {
  console.error(`release-guard: ${msg}`);
  process.exit(1);
};

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== "main") fail(`on branch "${branch}" — release from main only (merge the PR first)`);

if (git("status", "--porcelain") !== "") fail("working tree is not clean — commit or stash first");

git("fetch", "origin", "main", "--tags", "--quiet");
const head = git("rev-parse", "HEAD");
const remote = git("rev-parse", "origin/main");
if (head !== remote)
  fail(`local main (${head.slice(0, 7)}) != origin/main (${remote.slice(0, 7)}) — pull (or push) first`);

const freshness = evalFreshness({
  runFiles: readdirSync("tools/generation-eval/runs"),
  tagLines: git("for-each-ref", "--format=%(refname:short)%09%(creatordate:short)", "refs/tags").split("\n"),
  limit: EVAL_RELEASE_LIMIT,
});
if (!freshness.ok) fail(freshness.message);
console.log(`release-guard: ${freshness.message}`);

const released = JSON.parse(readFileSync("packages/react/package.json", "utf8")).version;
let stamp = null;
try {
  stamp = JSON.parse(readFileSync("docs/figma-library.json", "utf8"));
} catch {
  // figmaWarning reports a missing or unreadable stamp.
}
const warning = figmaWarning({ stamp, released });
if (warning) console.warn(`release-guard: WARNING: ${warning}`);

console.log("release-guard: on clean, up-to-date main — proceeding");
