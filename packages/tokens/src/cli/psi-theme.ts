#!/usr/bin/env node
// D81 — psi-theme <definition> --name <name> [--out <file>]
// The definition is an ES module whose default export is a CustomerTheme.
// Exit codes: 0 built · 1 refused by a gate or invalid · 2 usage error.
import { writeFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { buildThemeCss, type CustomerTheme } from "../theme/index.js";

const USAGE = "usage: psi-theme <definition-module> --name <theme-name> [--out <file.css>]";

export async function run(argv: readonly string[]): Promise<number> {
  const args = [...argv];
  const take = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    if (i === -1) return undefined;
    const value = args[i + 1];
    args.splice(i, 2);
    return value;
  };
  const name = take("--name");
  const out = take("--out");
  const definition = args[0];
  if (!definition || !name || args.length !== 1) {
    console.error(USAGE);
    return 2;
  }

  let theme: CustomerTheme;
  try {
    const mod = (await import(pathToFileURL(resolvePath(definition)).href)) as { default?: CustomerTheme };
    if (!mod.default) throw new Error(`${definition} has no default export`);
    theme = mod.default;
  } catch (e) {
    console.error(`psi-theme: cannot load ${definition}: ${(e as Error).message}`);
    return 2;
  }

  try {
    const { css, warnings } = buildThemeCss(name, theme);
    for (const w of warnings) console.warn(`psi-theme: gamut warning [${name}] ${w}`);
    if (out) writeFileSync(out, css);
    else process.stdout.write(css);
    return 0;
  } catch (e) {
    console.error(`psi-theme: ${(e as Error).message}`);
    return 1;
  }
}

// Run when executed as a program, not when imported by a test.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run(process.argv.slice(2)).then((code) => process.exit(code));
}
