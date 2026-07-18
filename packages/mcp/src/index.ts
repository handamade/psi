import { readFile } from "node:fs/promises";
import type { PsiIndex } from "./types.js";

export type { PsiIndex, ComponentEntry, TokenEntry, PropDoc } from "./types.js";
export { buildIndex, GETTING_STARTED } from "./index-builder.js";
export { createStore } from "./store.js";
export type { Store, Brief, Detail } from "./store.js";
export { createPsiServer } from "./server.js";

/** Loads the index baked next to the compiled module at publish time. */
export async function loadIndex(): Promise<PsiIndex> {
  const url = new URL("./psi-index.json", import.meta.url);
  return JSON.parse(await readFile(url, "utf8"));
}
