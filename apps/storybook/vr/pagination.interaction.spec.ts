import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D127 — Pagination's arrows hold still, and it fits a phone.
 *
 * jsdom does no layout, so none of this is visible to the unit tests. Before
 * D127, a 100-page pager showed 5, 6 or 7 slots of three widths, and Next's
 * left edge moved between 251px and 361px as the page changed; the widest
 * form overflowed a 320px screen by 73px; and a pager wider than its
 * container squeezed its 32px arrows to 16px. No screenshots. */

const story = (args: string) =>
  `/iframe.html?id=data-pagination--hundred-pages&globals=theme:light&args=${args}`;

interface Pager { prevLeft: number; nextLeft: number; width: number; arrows: number[]; slots: number }
const measure = (page: Page): Promise<Pager> =>
  page.locator("#storybook-root nav").evaluate((nav) => {
    const shown = [...nav.children].filter((el) => getComputedStyle(el).display !== "none");
    const prev = shown[0].getBoundingClientRect();
    const next = shown[shown.length - 1].getBoundingClientRect();
    return {
      prevLeft: prev.left,
      nextLeft: next.left,
      width: next.right - prev.left,
      arrows: [prev.width, next.width],
      slots: shown.length - 2,
    };
  });

const PAGES = [1, 2, 3, 4, 5, 50, 96, 97, 98, 99, 100];

test("Previous and Next hold still on every page of 100 @interaction", async ({ page }) => {
  const seen: Pager[] = [];
  for (const n of PAGES) {
    await page.goto(story(`page:${n}`), { waitUntil: "networkidle" });
    seen.push(await measure(page));
  }
  for (const m of seen) {
    expect(m.slots).toBe(7);
    expect(m.prevLeft).toBe(seen[0].prevLeft);
    expect(m.nextLeft).toBe(seen[0].nextLeft);
    expect(m.arrows).toEqual([32, 32]);
  }
});

test("the compact form holds still and fits a 320px screen @interaction", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const seen: Pager[] = [];
  for (const n of PAGES) {
    await page.goto(story(`page:${n}`), { waitUntil: "networkidle" });
    seen.push(await measure(page));
  }
  for (const m of seen) {
    expect(m.slots).toBe(5);
    expect(m.nextLeft).toBe(seen[0].nextLeft);
    expect(m.arrows).toEqual([32, 32]);
    // A 320px screen with 16px gutters leaves 288px.
    expect(m.width).toBeLessThanOrEqual(288);
  }
});
