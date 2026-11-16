import type { Page } from "@playwright/test";

export const BASE = "http://localhost:6210";

/** axe-core ships in the repo root's node_modules; addScriptTag resolves from cwd. */
export async function runAxe(page: Page) {
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  return page.evaluate(async () => {
    // @ts-expect-error injected global
    const results = await axe.run(document, { resultTypes: ["violations"] });
    return results.violations.map((v: { id: string; nodes: unknown[] }) => ({
      id: v.id,
      count: v.nodes.length,
    }));
  });
}
