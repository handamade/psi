import { build, context } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes("--watch");

const distDir = resolve(__dirname, "dist");
mkdirSync(distDir, { recursive: true });

// Copy ui.html to dist
copyFileSync(
  resolve(__dirname, "src/ui.html"),
  resolve(distDir, "ui.html"),
);

const buildOptions = {
  entryPoints: [resolve(__dirname, "src/code.ts")],
  bundle: true,
  format: "iife",
  minify: !isWatch,
  outfile: resolve(distDir, "code.js"),
  target: "es2020",
};

if (isWatch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log("[figma-plugin] Watching for changes...");
} else {
  await build(buildOptions);
  console.log("[figma-plugin] Build complete.");
}
