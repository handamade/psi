import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D135 — `--psi-toolbar-control-width` reaches a control inside a Field that is a direct Toolbar child, as it
 * reaches a bare one, unless that Field sets its own `controlWidth` (D125). jsdom does no layout, so the widths
 * are measured here, in Chromium. Before D135 the labelled presets measured about 172 and 80 (filter-form) and 141
 * and 141 (date-range-filter) where filter-toolbar measured 200. A Field's controlWidth is excluded by name in
 * the rule; field-control-width.interaction.spec.ts measures it. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

const widths = (page: Page, selector: string): Promise<number[]> =>
  page.locator(selector).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));

const TOKEN = 200;

test("filter-toolbar's bare controls take the toolbar width @interaction", async ({ page }) => {
  await page.goto(story("patterns-presets--filter-toolbar"), { waitUntil: "networkidle" });
  const ws = await widths(page, "#storybook-root :is(input, select)");
  expect(ws.length).toBeGreaterThanOrEqual(2);
  for (const w of ws) expect(w).toBeCloseTo(TOKEN, 0);
});

for (const id of ["filter-form", "date-range-filter"]) {
  test(`${id}'s controls inside Fields take the toolbar width @interaction`, async ({ page }) => {
    await page.goto(story(`patterns-presets--${id}`), { waitUntil: "networkidle" });
    const ws = await widths(page, "#storybook-root [data-psi-field] > :is(input, select)");
    expect(ws.length).toBe(2);
    for (const w of ws) expect(w).toBeCloseTo(TOKEN, 0);
  });
}

// A side-labelled Field is a label-and-value pair ("Rows per page", D115) and keeps its content width: before
// D135 the pager presets' page-size Select measured 58px, and it must not grow to the token.
for (const id of ["table-pagination", "cursor-pagination"]) {
  test(`${id}'s side-labelled page-size Select keeps its content width @interaction`, async ({ page }) => {
    await page.goto(story(`patterns-presets--${id}`), { waitUntil: "networkidle" });
    const ws = await widths(page, "#storybook-root [data-psi-field][data-label-position=start] > select");
    expect(ws.length).toBe(1);
    expect(ws[0]).toBeLessThan(100);
  });
}
