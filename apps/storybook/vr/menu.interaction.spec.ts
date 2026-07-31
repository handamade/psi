import { test, expect } from "@playwright/test";

/** Interaction coverage for Menu's dismissal ordering (D58).
 *
 * These tests take NO screenshots, so unlike stories.spec.ts they are
 * platform-independent and pass on macOS as well as CI. Every test carries
 * the @interaction tag so `pnpm test:e2e` can select them alone.
 *
 * This whole class is unreachable from jsdom: vitest.setup.ts's Popover
 * polyfill dispatches `toggle` synchronously and implements neither light
 * dismiss nor the mutual dismissal of popover="auto". That gap is why D53
 * shipped the bug this file pins. */

const STORY = "/iframe.html?id=components-menu--switching-between-menus&globals=theme:light";

const menu = (id: string) => `[data-psi-menu][aria-label="Menu ${id}"]`;

test("switching from one menu to another leaves the new one open @interaction", async ({ page }) => {
  await page.goto(STORY, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "A", exact: true }).click();
  await expect(page.locator(menu("a"))).toBeVisible();
  await expect(page.locator(menu("b"))).toBeHidden();

  // The regression: the platform light-dismisses A before the consumer's click
  // handler runs, and A's late toggle used to report onClose("outside") —
  // clearing openId and closing B milliseconds after it opened.
  await page.getByRole("button", { name: "B", exact: true }).click();
  await expect(page.locator(menu("b"))).toBeVisible();
  await expect(page.locator(menu("a"))).toBeHidden();

  // A's stale toggle lands ~50ms after the click; outlast it before asserting
  // that nothing was reported and that B survived it.
  //
  // This assertion is stricter than the shipped contract. The invariant is
  // "B survives"; asserting "none" additionally assumes the queued `toggle`
  // is delivered after the click handler that opens B. If a future browser
  // delivered it before instead, the behaviour would still be correct
  // (report, then reopen) but this line would go red for the wrong reason —
  // a failure here does not by itself mean the invariant broke, only that
  // the delivery ordering changed. It is kept anyway: it is the sharpest
  // available signal, and the `toBeVisible()` below is the one that actually
  // pins the invariant.
  await page.waitForTimeout(250);
  await expect(page.getByTestId("last-reason")).toHaveText("none");
  await expect(page.locator(menu("b"))).toBeVisible();
});

test("a genuine outside click still reports onClose(\"outside\") @interaction", async ({ page }) => {
  await page.goto(STORY, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "A", exact: true }).click();
  await expect(page.locator(menu("a"))).toBeVisible();

  // Far from both triggers and the open menu.
  await page.mouse.click(20, 700);

  await expect(page.locator(menu("a"))).toBeHidden();
  await expect(page.getByTestId("last-reason")).toHaveText("outside");
});

test("Esc reports onClose(\"esc\") and the consumer closes it @interaction", async ({ page }) => {
  await page.goto(STORY, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "A", exact: true }).click();
  await expect(page.locator(menu("a"))).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.locator(menu("a"))).toBeHidden();
  await expect(page.getByTestId("last-reason")).toHaveText("esc");
});
