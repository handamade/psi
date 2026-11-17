import { fileURLToPath } from "node:url";

import { withDocs } from "../scripts/bake-docs.js";
import { buildIndex } from "../src/index-builder.js";
import type { PsiIndex } from "../src/types.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));

export async function loadTestIndex(): Promise<PsiIndex> {
  return withDocs(
    await buildIndex({
      tokensDist: `${pkgs}tokens/dist`,
      reactDist: `${pkgs}react/dist`,
      reactDocs: `${pkgs}react/docs`,
      version: "0.0.0-test",
    }),
  );
}
