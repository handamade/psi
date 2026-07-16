// Preflight for `pnpm release`: refuse unless we're releasing exactly what
// main ships. Exists because pnpm publish's own branch check is a soft prompt
// (answerable with "Y") and exits 0 on refusal, letting `changeset tag` run
// anyway — this guard is hard and runs before anything else.
import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const fail = (msg) => {
  console.error(`release-guard: ${msg}`);
  process.exit(1);
};

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== "main") fail(`on branch "${branch}" — release from main only (merge the PR first)`);

if (git("status", "--porcelain") !== "") fail("working tree is not clean — commit or stash first");

git("fetch", "origin", "main", "--quiet");
const head = git("rev-parse", "HEAD");
const remote = git("rev-parse", "origin/main");
if (head !== remote)
  fail(`local main (${head.slice(0, 7)}) != origin/main (${remote.slice(0, 7)}) — pull (or push) first`);

console.log("release-guard: on clean, up-to-date main — proceeding");
