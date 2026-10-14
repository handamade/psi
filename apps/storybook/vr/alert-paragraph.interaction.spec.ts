import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D95 — a paragraph in the body of a Banner or an InlineAlert starts on the
 * icon's line, and consecutive paragraphs are 8px apart.
 *
 * jsdom does no layout, so the unit tests read the rules; this measures what
 * they render. Before D95 a `<p>` kept the browser's 1em margin and its first
 * line sat 14px below the top of the icon. No screenshots. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

interface Box { top: number; bottom: number; }
const boxes = (page: Page, selector: string): Promise<Box[]> =>
  page.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    }),
  );

for (const [name, root] of [
  ["banner", "[data-psi-banner]"],
  ["inlinealert", "[data-psi-inline-alert]"],
] as const) {
  test(`${name}: a paragraph starts on the icon's line @interaction`, async ({ page }) => {
    await page.goto(story(`feedback-${name}--with-paragraph`), { waitUntil: "networkidle" });
    const [icon] = await boxes(page, `${root} > span:first-child`);
    const [body] = await boxes(page, `${root} p >> xpath=..`);
    const [title] = await boxes(page, `${root} strong`);
    const [p] = await boxes(page, `${root} p`);
    expect(body.top).toBeCloseTo(icon.top, 0);
    expect(title.top).toBeCloseTo(body.top, 0);
    expect(p.top).toBeCloseTo(title.bottom, 0);
    expect(p.bottom).toBeCloseTo(body.bottom, 0);
  });

  test(`${name}: consecutive paragraphs are 8px apart @interaction`, async ({ page }) => {
    await page.goto(story(`feedback-${name}--with-paragraphs`), { waitUntil: "networkidle" });
    const [first, second] = await boxes(page, `${root} p`);
    expect(second.top - first.bottom).toBeCloseTo(8, 0);
  });
}
