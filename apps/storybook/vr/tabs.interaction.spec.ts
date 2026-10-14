import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Keyboard coverage for D67 — automatic activation and the roving tabindex.
 *
 * These tests take NO screenshots, so like the other @interaction specs they
 * are platform-independent. jsdom approximates focus rather than reproducing
 * it, and the unit suite can be satisfied by a re-render that happens to put
 * the right element in `document.activeElement`; a real browser is where
 * "focus actually moved, and Tab actually left the list" can be asserted. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

const activeText = (page: Page) =>
  page.evaluate(() => document.activeElement?.textContent ?? null);

test("arrow keys move focus and selection together @interaction", async ({ page }) => {
  await page.goto(story("components-tabs--horizontal"), { waitUntil: "networkidle" });

  await page.getByRole("tab", { name: "All" }).focus();
  await page.keyboard.press("ArrowRight");

  expect(await activeText(page)).toBe("Uncategorised");
  await expect(page.getByRole("tab", { selected: true })).toHaveText("Uncategorised");
});

test("the tab list is a single tab stop, and Tab lands on the panel @interaction", async ({
  page,
}) => {
  // This is the payoff of the roving tabindex and cannot be observed in jsdom:
  // Tab must skip the remaining tabs entirely rather than walking through them.
  await page.goto(story("components-tabs--horizontal"), { waitUntil: "networkidle" });

  await page.getByRole("tab", { name: "All" }).focus();
  await page.keyboard.press("Tab");

  const role = await page.evaluate(() => document.activeElement?.getAttribute("role"));
  expect(role).toBe("tabpanel");
});

test("arrows wrap and skip the disabled tab @interaction", async ({ page }) => {
  await page.goto(story("components-tabs--with-disabled-tab"), { waitUntil: "networkidle" });

  await page.getByRole("tab", { name: "All" }).focus();
  await page.keyboard.press("ArrowRight");
  // "Uncategorised" is the disabled one in this story, so it must be jumped.
  expect(await activeText(page)).toBe("This month");

  await page.keyboard.press("ArrowRight");
  expect(await activeText(page)).toBe("All"); // wrapped
});

test("a vertical list uses the block axis and ignores Left/Right @interaction", async ({
  page,
}) => {
  await page.goto(story("components-tabs--vertical"), { waitUntil: "networkidle" });

  await page.getByRole("tab", { name: "All" }).focus();
  await page.keyboard.press("ArrowRight");
  expect(await activeText(page)).toBe("All");

  await page.keyboard.press("ArrowDown");
  expect(await activeText(page)).toBe("Uncategorised");
});

test("a utility class beats the component's own value: psi-gap-24 on a Tabs root @interaction", async ({
  page,
}) => {
  // D94. Before it, tabs.module.css was unlayered and `.tabs { gap: 16px }`
  // beat `.psi-gap-24` in @layer psi.utilities whatever the specificity, so the
  // class did nothing. The class is added in the page rather than through a
  // story, so this needs no new screenshot baseline.
  await page.goto(story("components-tabs--horizontal"), { waitUntil: "networkidle" });

  const root = page.locator('[data-orientation="horizontal"]').filter({ has: page.getByRole("tablist") }).first();
  expect(await root.evaluate((el) => getComputedStyle(el).rowGap)).toBe("16px");

  await root.evaluate((el) => el.classList.add("psi-gap-24"));
  expect(await root.evaluate((el) => getComputedStyle(el).rowGap)).toBe("24px");
});
