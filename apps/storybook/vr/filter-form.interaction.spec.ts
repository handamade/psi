import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D87 — a filter form's controls share one control line, and it submits.
 *
 * jsdom does no layout, so none of this is visible to the unit tests: that
 * Input renders the height its size names (it measured 4px over at every size
 * while it was content-box), that `Toolbar align="end"` puts a text field, a
 * select and a button on one line, and that `as="form"` makes Enter in a
 * field submit. Since D92 the preset is `align="start"`, which must put them
 * on the same line, and keep them there when a field shows an error. No
 * screenshots. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

interface Box { top: number; bottom: number; height: number; }
const box = (page: Page, selector: string): Promise<Box> =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height };
  });

test("Input renders the height its size names @interaction", async ({ page }) => {
  await page.goto(story("components-input--all-sizes"), { waitUntil: "networkidle" });
  const heights = await page.locator("#storybook-root input").evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().height),
  );
  expect(heights).toEqual([24, 32, 40, 48]);
});

test("the filter-form preset puts its field, select and Find on one control line @interaction", async ({ page }) => {
  await page.goto(story("patterns-presets--filter-form"), { waitUntil: "networkidle" });
  const input = await box(page, "#storybook-root form input");
  const select = await box(page, "#storybook-root form select");
  const find = await box(page, "#storybook-root form button[type=submit]");
  for (const other of [select, find]) {
    expect(other.top).toBeCloseTo(input.top, 0);
    expect(other.bottom).toBeCloseTo(input.bottom, 0);
  }
  expect(input.height).toBe(32);
});

// D92: under align="start" a field's error line hangs below its control. The
// three controls and Find must keep one bottom edge to the pixel, and the
// error must sit under the control it describes, not beside the row.
test("a field in error keeps the filter row on one control line, with its error below @interaction", async ({ page }) => {
  await page.goto(story("components-toolbar--filter-form-with-a-field-in-error"), { waitUntil: "networkidle" });
  const form = page.locator("#storybook-root form");
  const bottoms = await form.locator("input, select, button[type=submit]").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), top: r.top, bottom: r.y + r.height };
    }),
  );
  expect(bottoms.map((b) => b.tag)).toEqual(["input", "select", "input", "button"]);
  for (const b of bottoms) {
    expect(b.bottom, `${b.tag} bottom`).toBe(bottoms[0].bottom);
    expect(b.top, `${b.tag} top`).toBe(bottoms[0].top);
  }
  const select = await box(page, "#storybook-root form select");
  const error = page.getByText("Pick a status.");
  const errorBox = await error.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height };
  });
  expect(errorBox.top).toBeGreaterThanOrEqual(select.bottom);
  const describedBy = await page.locator("#storybook-root form select").getAttribute("aria-describedby");
  expect(describedBy).toBe(await error.getAttribute("id"));
});

test("Enter in the filter-form's text field submits the form once @interaction", async ({ page }) => {
  await page.goto(story("patterns-presets--filter-form"), { waitUntil: "networkidle" });
  await page.locator("#storybook-root form").evaluate((form) => {
    (window as unknown as { submits: number }).submits = 0;
    form.addEventListener("submit", (e) => {
      e.preventDefault(); // the preset has no handler; keep the story on the page
      (window as unknown as { submits: number }).submits++;
    });
  });
  await page.locator("#storybook-root form input").first().fill("abc");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => (window as unknown as { submits: number }).submits)).toBe(1);
  await expect(page.getByRole("form", { name: /filter/i })).toBeVisible();
});

test("the cursor-pagination preset's page size and pager share their bottom edge @interaction", async ({ page }) => {
  await page.goto(story("patterns-presets--cursor-pagination"), { waitUntil: "networkidle" });
  const select = await box(page, "#storybook-root select");
  const pager = await box(page, "#storybook-root nav button");
  expect(pager.bottom).toBeCloseTo(select.bottom, 0);
});
