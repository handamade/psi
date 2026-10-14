import { test, expect } from "@playwright/test";

/** D97 — a direct svg child of a Button renders at --psi-button-{n}-icon-size,
 * half the button's height, whatever the icon's own `size` prop. IconButton
 * does not bind the ramp.
 *
 * jsdom does no layout, so the unit tests read the rules; this measures the
 * rendered icons. Before D97 every icon here rendered at its default 20.
 * No screenshots. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

test("a Button sizes its icon at half its height; an IconButton keeps its own @interaction", async ({ page }) => {
  await page.goto(story("components-button--icon-sizes"), { waitUntil: "networkidle" });
  const sizes = await page.locator("#storybook-root button > svg").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return [r.width, r.height];
    }),
  );
  expect(sizes).toEqual([
    [12, 12],
    [16, 16],
    [20, 20],
    [24, 24],
    [20, 20],
  ]);
});
