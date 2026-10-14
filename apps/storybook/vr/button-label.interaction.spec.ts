import { test, expect } from "@playwright/test";

/** D98 — a Button label wrapped in a <span> is capped by
 * --psi-button-label-max-width and ends in an ellipsis; without the token it
 * is as wide as its text. jsdom does no layout, so the unit tests read the
 * rules; this measures the rendered label. Before D98 the capped button grew
 * to its full label. No screenshots. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

test("a capped label stops at the cap and ends in an ellipsis; an uncapped one does not @interaction", async ({ page }) => {
  await page.goto(story("components-button--label-max-width"), { waitUntil: "networkidle" });
  const measure = (testId: string) =>
    page.getByTestId(testId).locator("> span").evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      textOverflow: getComputedStyle(el).textOverflow,
    }));
  const capped = await measure("capped");
  const uncapped = await measure("uncapped");
  expect(capped.width).toBeCloseTo(160, 0);
  expect(capped.scrollWidth).toBeGreaterThan(capped.clientWidth);
  expect(capped.textOverflow).toBe("ellipsis");
  expect(uncapped.width).toBeGreaterThan(160);
  expect(uncapped.scrollWidth).toBeLessThanOrEqual(uncapped.clientWidth);
  await expect(page.getByRole("button", { name: "Alexandra Konstantinopoulou-Vasilakis" })).toHaveCount(2);
});
