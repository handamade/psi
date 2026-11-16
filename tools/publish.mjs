// The publish step of `pnpm release`: pack each public package with pnpm,
// publish the tarball with npm, one at a time, in dependency order.
//
// Why not `pnpm -r publish`: the account's 2FA is confirmed in the browser,
// not with a typed code. npm's own `publish` prints an npmjs.com/auth/cli/…
// link and waits for the approval; pnpm 11.9 only handles a typed OTP and
// fails the same request as `E404 Not Found - PUT …`, which reads like an
// expired login. That cost the 0.30.0 release three reruns.
//
// Why pack with pnpm: `pnpm pack` rewrites `workspace:*` to the real version.
// A plain `npm publish` from a package folder would ship `workspace:*` and the
// package could not be installed.
//
// Safe to rerun: a version already on the registry is skipped, so a release
// that stopped after one package picks up where it left off.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { publishOrder, workspaceLeaks } from "./lib/publish-plan.mjs";

const root = resolve(import.meta.dirname, "..");
const fail = (msg) => {
  console.error(`publish: ${msg}`);
  process.exit(1);
};

// `--dry-run` prints what would be published and stops before packing.
const dryRun = process.argv.includes("--dry-run");

// Only folders that are packages: a checkout can also hold `packages/node_modules`
// (a hoisted install), which has no package.json of its own. The 0.31.0 release
// stopped here with ENOENT before publishing anything.
const pkgs = readdirSync(join(root, "packages"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "node_modules")
  .map((d) => join(root, "packages", d.name))
  .filter((dir) => existsSync(join(dir, "package.json")))
  .map((dir) => {
    const json = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    return { name: json.name, dir, json };
  })
  .filter((p) => !p.json.private);

// The registry, asked fresh: npm's local metadata cache can lag a publish by minutes.
const isPublished = (name, version) => {
  try {
    const out = execFileSync("npm", ["view", `${name}@${version}`, "version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      env: { ...process.env, npm_config_prefer_online: "true" },
    });
    return out.trim() === version;
  } catch {
    return false; // E404: this version is not on the registry yet
  }
};

const order = publishOrder(pkgs);
console.log(`publish: ${order.map((p) => `${p.name}@${p.json.version}`).join(", ")}`);

if (dryRun) {
  for (const { name, json } of order) {
    const state = isPublished(name, json.version) ? "already on npm, would skip" : "would publish";
    console.log(`publish (dry run): ${name}@${json.version} ${state}`);
  }
  process.exit(0);
}

const dest = mkdtempSync(join(tmpdir(), "psi-publish-"));
try {
  for (const { name, dir, json } of order) {
    const id = `${name}@${json.version}`;
    if (isPublished(name, json.version)) {
      console.log(`publish: ${id} is already on npm, skipping`);
      continue;
    }

    const packed = execFileSync("pnpm", ["pack", "--pack-destination", dest], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    });
    const tarball = packed.trim().split("\n").at(-1).trim();

    const packedJson = JSON.parse(
      execFileSync("tar", ["-xOzf", tarball, "package/package.json"], { encoding: "utf8" }),
    );
    const leaks = workspaceLeaks(packedJson);
    if (leaks.length) fail(`${id}: the packed package.json still has ${leaks.join(", ")}`);

    console.log(`\npublish: ${id} — npm will print an npmjs.com link. Open it, approve, and wait here.`);
    const result = spawnSync("npm", ["publish", tarball, "--access", "public"], { stdio: "inherit" });
    if (result.status !== 0) {
      fail(
        `${id} did not publish (npm exited ${result.status}). ` +
          "E409 \"previously staged\" means it did upload and npm is slow to list it: wait a few minutes and rerun. " +
          "E404 or E401 means the login is gone: run `npm whoami`, then `npm login`, then rerun. " +
          "Packages already published are skipped on a rerun.",
      );
    }
  }
} finally {
  rmSync(dest, { recursive: true, force: true });
}

console.log("publish: done");
