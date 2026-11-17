import {
  componentPageMd as pageMd,
  guideMd as guideOf,
  overviewMd as overviewOf,
  tokenPageMd as tokensMd,
  type ComponentPage,
  type TokenPage,
} from "@handamade/psi-docs";
import { loadDocsInput } from "@handamade/psi-docs/node";

/** The site's twins come from the same builders and the same input as the
 * MCP's `get` (D129), so the two cannot say different things. */
export const componentPageMd = (page: ComponentPage): string => pageMd(loadDocsInput(), page);
export const tokenPageMd = (page: TokenPage): string => tokensMd(loadDocsInput(), page);
export const overviewMd = (): string => overviewOf(loadDocsInput());

export function guideMd(id: string): string {
  const input = loadDocsInput();
  const guide = input.guides.find((g) => g.id === id);
  if (!guide) throw new Error(`No guide "${id}" in @handamade/psi-docs`);
  return guideOf(input, guide);
}
