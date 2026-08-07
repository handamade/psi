#!/usr/bin/env node
// Verifies a PUBLISHED release the way a consumer meets it: a scratch npm
// project outside the workspace, installing the real tarballs.
//
// Why this cannot be a CI step and cannot be replaced by an in-repo test:
// pnpm links `@handamade/psi-react` through the filesystem, so the workspace
// never evaluates an `exports` condition and never consults the package's
// public entry point. Two real bugs reached npm through that blind spot:
//
//   D68  `import "@handamade/psi-react/styles"` — the spelling every doc
//        prescribes — was TS2882 in a standard TypeScript + Vite consumer,
//        because ./styles had no `types` condition.
//   D74  IconMoreHorizontal shipped in 0.14.0, and the `row-actions` pattern's
//        preset rendered it, but it was never added to the hand-written
//        re-export list in src/index.ts. The published preset was code nobody
//        could compile.
//
// Both were invisible to `build`, `test`, `lint`, `check-docs-drift` and `vr`.
// D74 in particular slipped past a guard written to catch exactly it, because
// that guard resolved names against the source directory instead of the
// package's public surface. Hence this script's rule: **every assertion here
// reads the installed package, never the repo.**
//
// Usage:
//   node tools/verify-published.mjs            # verifies `latest`
//   node tools/verify-published.mjs 0.14.2     # verifies a specific version
//   node tools/verify-published.mjs --keep     # leave the scratch project

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const keep = args.includes("--keep");
const version = args.find((a) => !a.startsWith("--")) ?? "latest";

const REACT_PKG = "@handamade/psi-react";
const TOKENS_PKG = "@handamade/psi-tokens";
/** All five, in the order the docs prescribe. utilities.css is the one that
 * gets forgotten — .psi-container and the reduced-motion zeroing live there. */
const STYLESHEETS = [
  `${TOKENS_PKG}/base.css`,
  `${TOKENS_PKG}/light.css`,
  `${TOKENS_PKG}/components.css`,
  `${TOKENS_PKG}/utilities.css`,
  `${REACT_PKG}/styles`,
];

const failures = [];
const note = (ok, label, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
};

const run = (cmd, cmdArgs, cwd) =>
  execFileSync(cmd, cmdArgs, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const dir = mkdtempSync(join(tmpdir(), "psi-verify-"));
console.log(`\nVerifying ${REACT_PKG}@${version} in ${dir}\n`);

try {
  // ── Install ──────────────────────────────────────────────────────────
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "psi-verify", private: true, type: "module" }, null, 2));
  run("npm", ["install", "--silent", `${REACT_PKG}@${version}`, `${TOKENS_PKG}@${version}`, "react", "react-dom"], dir);
  run("npm", ["install", "--silent", "-D", "typescript", "vite", "@vitejs/plugin-react", "@types/react", "@types/react-dom"], dir);

  const installed = JSON.parse(readFileSync(join(dir, "node_modules", REACT_PKG, "package.json"), "utf8"));
  console.log(`  resolved to ${installed.version}\n`);

  // ── LICENSE ships in both tarballs (#54's fix, which nothing in-repo checks)
  for (const pkg of [REACT_PKG, TOKENS_PKG]) {
    note(existsSync(join(dir, "node_modules", pkg, "LICENSE")), `LICENSE present in ${pkg}`);
  }

  // ── Every export target resolves through the published `exports` map ──
  for (const spec of STYLESHEETS) {
    let ok = true;
    let detail = "";
    try {
      run("node", ["-e", `require("module").createRequire(process.cwd()+"/x.js").resolve(${JSON.stringify(spec)})`], dir);
    } catch (e) {
      ok = false;
      detail = String(e.stderr ?? e).split("\n").find((l) => l.includes("Error")) ?? "unresolved";
    }
    note(ok, `resolves ${spec}`, detail);
  }

  // ── The public export surface, read from the INSTALLED package ────────
  const dts = readFileSync(join(dir, "node_modules", REACT_PKG, "dist", "index.d.ts"), "utf8");
  const values = [];
  const types = [];
  for (const m of dts.matchAll(/^export\s+(type\s+)?\{([^}]+)\}/gm)) {
    const names = m[2].split(",").map((n) => n.trim().split(/\s+as\s+/).pop()).filter(Boolean);
    (m[1] ? types : values).push(...names);
  }
  note(values.length > 0, `parsed export surface`, `${values.length} values, ${types.length} types`);

  // ── The generated consumer ────────────────────────────────────────────
  // Every value is imported AND referenced at runtime, so a name present in
  // the type surface but absent from the JS fails the bundle, not just tsc.
  writeFileSync(
    join(dir, "src", "surface.ts"),
    [
      `import { ${values.join(", ")} } from "${REACT_PKG}";`,
      types.length ? `import type { ${types.join(", ")} } from "${REACT_PKG}";` : "",
      types.length ? `export type { ${types.join(", ")} };` : "",
      `export const surface: unknown[] = [${values.join(", ")}];`,
      `if (surface.some((v) => v === undefined)) throw new Error("a published export is undefined at runtime");`,
      "",
    ].filter(Boolean).join("\n"),
  );

  // ── Every identifier a published preset renders must be importable ────
  // This is the check that actually catches D74, and it took two attempts to
  // get right. Importing "every export" cannot catch it: 0.14.0's index.d.ts
  // never mentioned IconMoreHorizontal, so the package was self-consistent and
  // passed. The defect was a mismatch between what `patterns.json` tells a
  // consumer to WRITE and what the package lets them IMPORT — so that is what
  // has to be compared. Both sides read from the installed tarball.
  const patternsPath = join(dir, "node_modules", REACT_PKG, "dist", "patterns.json");
  if (existsSync(patternsPath)) {
    const { patterns } = JSON.parse(readFileSync(patternsPath, "utf8"));
    const unimportable = new Map();
    for (const pattern of patterns) {
      if (!pattern.preset) continue;
      for (const m of pattern.preset.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
        if (!values.includes(m[1])) {
          if (!unimportable.has(m[1])) unimportable.set(m[1], new Set());
          unimportable.get(m[1]).add(pattern.id);
        }
      }
    }
    const detail = [...unimportable]
      .map(([name, ids]) => `${name} (${[...ids].join(", ")})`)
      .join("; ");
    note(unimportable.size === 0, "every identifier in a published preset is exported", detail);
  } else {
    note(false, "dist/patterns.json ships in the tarball");
  }

  // The smoke composition adapts to what this version actually exports, so the
  // script can be pointed at an older release to bisect a regression without
  // failing on components that did not exist yet. Only the stylesheet imports
  // and the full-surface import are version-independent — and those are the
  // two things that carried the real bugs.
  const canUse = (n) => values.includes(n);
  const body = [
    canUse("DescriptionList") && canUse("DescriptionItem")
      ? `      <DescriptionList><DescriptionItem term="Exports">{surface.length}</DescriptionItem></DescriptionList>`
      : null,
    canUse("Button")
      ? `      <Button variant="accent" size={40}>{${canUse("IconMoreHorizontal") ? "<IconMoreHorizontal />" : '"Go"'}}</Button>`
      : null,
    canUse("Tag") ? `      <Tag variant="accent" subtle>{surface.length} exports</Tag>` : null,
  ].filter(Boolean);
  const smokeImports = ["DescriptionList", "DescriptionItem", "Button", "IconMoreHorizontal", "Tag"].filter(canUse);

  writeFileSync(
    join(dir, "src", "app.tsx"),
    `${STYLESHEETS.map((s) => `import ${JSON.stringify(s)};`).join("\n")}
import { createRoot } from "react-dom/client";
${smokeImports.length ? `import { ${smokeImports.join(", ")} } from "${REACT_PKG}";` : ""}
import { surface } from "./surface.js";

// A real composition, so the bundle exercises components rather than only
// resolving their names.
export function App() {
  return (
    <div className="psi-container">
${body.join("\n")}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
`,
  );

  writeFileSync(join(dir, "src", "vite-env.d.ts"), '/// <reference types="vite/client" />\n');
  writeFileSync(
    join(dir, "index.html"),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/app.tsx"></script></body></html>\n',
  );
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM"],
          module: "ESNext",
          // What a Vite consumer actually uses — and the mode under which the
          // D68 `exports`-condition bug appeared.
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );
  writeFileSync(join(dir, "vite.config.ts"), `import react from "@vitejs/plugin-react";\nexport default { plugins: [react()] };\n`);

  // ── Typecheck: the D68 and D74 gate ───────────────────────────────────
  let tscOut = "";
  let tscOk = true;
  try {
    run("npx", ["tsc", "--noEmit"], dir);
  } catch (e) {
    tscOk = false;
    tscOut = String(e.stdout ?? "").trim();
  }
  note(tscOk, "tsc --noEmit over every published export");
  if (!tscOk) console.log(tscOut.split("\n").slice(0, 20).map((l) => `       ${l}`).join("\n"));

  // ── Bundle: catches a type-only export with no runtime backing ─────────
  let viteOk = true;
  let viteOut = "";
  try {
    run("npx", ["vite", "build", "--logLevel", "error"], dir);
  } catch (e) {
    viteOk = false;
    viteOut = String(e.stderr ?? e.stdout ?? "").trim();
  }
  note(viteOk, "vite build");
  if (!viteOk) console.log(viteOut.split("\n").slice(0, 20).map((l) => `       ${l}`).join("\n"));
} finally {
  if (keep) console.log(`\n  scratch project kept at ${dir}`);
  else rmSync(dir, { recursive: true, force: true });
}

console.log("");
if (failures.length > 0) {
  console.error(`verify-published FAILED (${failures.length}): ${failures.join(", ")}\n`);
  process.exit(1);
}
console.log("verify-published passed — the published package is usable by a real consumer.\n");
