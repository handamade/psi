import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/index-builder.js";

const pkgRoot = fileURLToPath(new URL("..", import.meta.url));
const pkgsRoot = fileURLToPath(new URL("../..", import.meta.url));
const pkg = JSON.parse(await readFile(`${pkgRoot}package.json`, "utf8"));

const index = await buildIndex({
  tokensDist: `${pkgsRoot}tokens/dist`,
  reactDist: `${pkgsRoot}react/dist`,
  reactDocs: `${pkgsRoot}react/docs`,
  version: pkg.version,
});

await mkdir(`${pkgRoot}dist`, { recursive: true });
await writeFile(`${pkgRoot}dist/psi-index.json`, JSON.stringify(index, null, 1));
console.log(
  `psi-index.json: ${index.components.length} components, ${index.tokens.length} tokens, ${index.themes.length} themes`,
);
