import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

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

/** D102 — the menu-button keyboard in a real browser: Arrow Down on the
 * focused trigger opens the menu on its first item (Menu clicks the trigger,
 * since it cannot open itself), Arrow Up opens it on the last, and Tab
 * reports onClose("tab") and lets focus move on to the next control — here
 * menu B's trigger, the next tab stop after menu A's popover. */
test("Arrow Down opens the menu on its first item, and Tab closes it and moves on @interaction", async ({ page }) => {
  await page.goto(STORY, { waitUntil: "networkidle" });
  const a = page.getByRole("button", { name: "A", exact: true });
  await expect(a).toHaveAttribute("aria-controls", /.+/);
  const controls = await a.getAttribute("aria-controls");
  await expect(page.locator(menu("a"))).toHaveAttribute("id", controls!);

  await a.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(menu("a"))).toBeVisible();
  await expect(page.locator(menu("a")).getByRole("menuitem", { name: "Edit" })).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.locator(menu("a"))).toBeHidden();
  await expect(page.getByTestId("last-reason")).toHaveText("tab");
  await expect(page.getByRole("button", { name: "B", exact: true })).toBeFocused();
});

test("Arrow Up opens the menu on its last item @interaction", async ({ page }) => {
  await page.goto(STORY, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "A", exact: true }).focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator(menu("a")).getByRole("menuitem", { name: "Duplicate" })).toBeFocused();
});

/** D131 — a menu longer than the popup cap. */
const LONG = "/iframe.html?id=components-menu--long-menu&globals=theme:light";
const longMenu = '[data-psi-menu][aria-label="Move to"]';

/** The menu's box, and whether an item's box lies inside it. */
async function inView(page: Page, name: string) {
  return page.evaluate(
    ({ sel, name }) => {
      const menu = document.querySelector(sel)!.getBoundingClientRect();
      const item = [...document.querySelectorAll(`${sel} [role="menuitem"]`)].find(
        (el) => el.textContent === name,
      )!.getBoundingClientRect();
      return item.top >= menu.top - 0.5 && item.bottom <= menu.bottom + 0.5;
    },
    { sel: longMenu, name },
  );
}

test("a long menu stops at the popup cap and scrolls, keeping the focused item in view @interaction", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(LONG, { waitUntil: "networkidle" });
  const menu = page.locator(longMenu);
  await expect(menu.getByRole("menuitem", { name: "Argentina" })).toBeFocused();

  const box = await menu.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { height: r.height, bottom: r.bottom, scrolls: el.scrollHeight > el.clientHeight };
  });
  // 320px of content plus 4px padding and a 1px border on each side.
  expect(box.height).toBe(330);
  expect(box.scrolls).toBe(true);
  expect(box.bottom).toBeLessThanOrEqual(768);

  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitem", { name: "Switzerland" })).toBeFocused();
  expect(await inView(page, "Switzerland")).toBe(true);
  expect(await inView(page, "Argentina")).toBe(false);

  await page.keyboard.press("ArrowDown"); // wraps
  await expect(menu.getByRole("menuitem", { name: "Argentina" })).toBeFocused();
  expect(await inView(page, "Argentina")).toBe(true);

  await page.keyboard.press("p"); // typeahead: Peru
  await expect(menu.getByRole("menuitem", { name: "Peru" })).toBeFocused();
  expect(await inView(page, "Peru")).toBe(true);
});

test("a long menu in a short window fits it, on the side with more room @interaction", async ({ page }) => {
  // Trigger near the top: too little room above or below for 330px, more below.
  await page.setViewportSize({ width: 1024, height: 300 });
  await page.goto(LONG, { waitUntil: "networkidle" });
  const geometry = () =>
    page.evaluate((sel) => {
      const menu = document.querySelector(sel)!.getBoundingClientRect();
      const trigger = document.querySelector("[data-psi-menu-trigger]")!.getBoundingClientRect();
      return { menuTop: menu.top, menuBottom: menu.bottom, triggerTop: trigger.top, triggerBottom: trigger.bottom };
    }, longMenu);

  let g = await geometry();
  expect(g.menuTop).toBeGreaterThanOrEqual(g.triggerBottom);
  expect(g.menuBottom).toBeLessThanOrEqual(300);
  expect(g.menuBottom).toBeGreaterThan(280); // fills the room, not a sliver

  // Trigger near the bottom: more room above, so it opens there.
  await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>("[data-psi-menu-trigger]")!;
    t.style.position = "fixed";
    t.style.top = "220px";
  });
  await page.waitForFunction(
    (sel) => document.querySelector(sel)!.getBoundingClientRect().bottom <= 220,
    longMenu,
  );
  g = await geometry();
  expect(g.menuBottom).toBeLessThanOrEqual(g.triggerTop);
  expect(g.menuTop).toBeGreaterThanOrEqual(0);
  expect(g.menuTop).toBeLessThan(20);
});

/** D131 — removing the focused item. */
const REMOVING = "/iframe.html?id=components-menu--removing-items&globals=theme:light";

test("removing the focused item moves focus to its neighbour, and an emptied menu keeps Esc @interaction", async ({ page }) => {
  await page.goto(REMOVING, { waitUntil: "networkidle" });
  const menu = page.locator('[data-psi-menu][aria-label="Notifications"]');
  const item = (name: string) => menu.getByRole("menuitem", { name: `Dismiss ${name}` });

  await expect(item("Build failed")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter"); // removes "Review requested", the middle one
  await expect(item("Invite accepted")).toBeFocused();

  await page.keyboard.press("Enter"); // removes the last: focus goes to the new last
  await expect(item("Build failed")).toBeFocused();

  await page.keyboard.press("Enter"); // removes the only one
  await expect(menu).toBeFocused();
  await expect(menu).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("last-reason")).toHaveText("esc");
  await expect(menu).toBeHidden();
});

/** D131 — disabled items are reachable and inert. */
test("Arrow Down reaches a disabled item, and Enter there does nothing @interaction", async ({ page }) => {
  await page.goto("/iframe.html?id=components-menu--with-disabled-item&globals=theme:light", { waitUntil: "networkidle" });
  const menu = page.locator("[data-psi-menu]");
  await expect(menu.getByRole("menuitem", { name: "Edit" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const archive = menu.getByRole("menuitem", { name: "Archive" });
  await expect(archive).toBeFocused();
  await expect(archive).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await expect(archive).toBeFocused();
  await expect(menu).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Delete" })).toBeFocused();
});
