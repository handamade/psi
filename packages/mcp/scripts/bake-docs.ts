import { buildDocsPages } from "@handamade/psi-docs";
import { loadDocsInput } from "@handamade/psi-docs/node";

import type { BaseIndex, PsiIndex } from "../src/types.js";

/** Adds every docs page, rendered by the same builders the site uses (D129). */
export function withDocs(index: BaseIndex): PsiIndex {
  return { ...index, docs: buildDocsPages(loadDocsInput(), { patterns: index.patterns, topics: index.topics }) };
}
