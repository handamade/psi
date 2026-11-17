import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D130 — the Combobox in a real browser. These take no screenshots, so they
 * pass on macOS too. jsdom's Popover polyfill implements neither the top
 * layer nor real focus movement, and does no layout, so none of these can be
 * unit tests: they are the rows of D130's "Real browser" list. */

const story = (id: string) => `/iframe.html?id=components-combobox--${id}&globals=theme:light`;

const popup = (page: Page) => page.locator("[data-psi-combobox-popup]").first();
const isOpen = (page: Page) => popup(page).evaluate((el) => el.matches(":popover-open"));

async function openFirst(page: Page) {
  const input = page.getByRole("combobox").first();
  await input.focus();
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => isOpen(page)).toBe(true);
  return input;
}

test("a pointerdown outside closes the list, and one in its own input doesn't @interaction", async ({ page }) => {
  await page.goto(story("default"), { waitUntil: "networkidle" });
  const input = page.getByRole("combobox");
  await input.click();
  await page.keyboard.type("er");
  await expect.poll(() => isOpen(page)).toBe(true);

  await input.click();
  expect(await isOpen(page)).toBe(true);
  await expect(input).toBeFocused();

  // Pressing an option keeps focus in the input (its mousedown is cancelled).
  await page.getByRole("option", { name: "Amsterdam Netherlands" }).hover();
  await page.mouse.down();
  await expect(input).toBeFocused();
  await page.mouse.up();
  await expect(input).toHaveValue("Amsterdam");

  await page.keyboard.press("ArrowDown");
  await expect.poll(() => isOpen(page)).toBe(true);
  await page.mouse.click(700, 700);
  await expect.poll(() => isOpen(page)).toBe(false);
});

test("Esc in a Combobox inside an open Dialog closes only the list @interaction", async ({ page }) => {
  await page.goto(story("open-in-dialog"), { waitUntil: "networkidle" });
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  await openFirst(page);

  await page.keyboard.press("Escape");
  await expect.poll(() => isOpen(page)).toBe(false);
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("dialog-close")).toHaveText("none");

  // With the list closed and no text, the next Esc reaches the Dialog.
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("dialog-close")).toHaveText("esc");
});

test("Enter on a highlighted option in a form picks it, and the form doesn't submit @interaction", async ({ page }) => {
  await page.goto(story("in-form"), { waitUntil: "networkidle" });
  const input = page.getByRole("combobox", { name: "City" });
  await input.click();
  await page.keyboard.type("ber");
  await expect(input).toHaveAttribute("aria-activedescendant", /option/);
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("Berlin");
  await expect.poll(() => isOpen(page)).toBe(false);
  await expect(page.getByTestId("submits")).toHaveText("0");
  await expect(page.locator('input[type="hidden"][name="city"]')).toHaveValue("ber");

  // With the list closed, Enter is the native one again: it submits.
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("submits")).toHaveText("1");
});

test("Tab closes the list and moves focus on, picking nothing @interaction", async ({ page }) => {
  await page.goto(story("in-form"), { waitUntil: "networkidle" });
  const input = page.getByRole("combobox", { name: "City" });
  await input.click();
  await page.keyboard.type("ber");
  await expect.poll(() => isOpen(page)).toBe(true);
  await page.keyboard.press("Tab");
  await expect.poll(() => isOpen(page)).toBe(false);
  await expect(page.getByRole("button", { name: "Save" })).toBeFocused();
  // Nothing was picked, so the unmatched text goes back to the (empty) value.
  await expect(input).toHaveValue("");
  await expect(page.locator('input[type="hidden"][name="city"]')).toHaveValue("");
});

async function popupAtLeastAsWide(page: Page, belowAnchorFloor = false) {
  await page.goto(story("open-in-field"), { waitUntil: "networkidle" });
  if (belowAnchorFloor) {
    // Faking CSS.supports reaches the hook, not the stylesheet's
    // @supports (anchor-name) block, which Chromium still applies: its
    // position-area would offset the script's inset a second time. A browser
    // below the floor has neither, so switch the CSS path off too.
    await page.addStyleTag({
      content: "[data-psi-combobox-popup] { position-area: none !important; position-try-fallbacks: none !important; }",
    });
  }
  await openFirst(page);
  const control = (await page.locator("[data-psi-combobox]").first().boundingBox())!;
  const box = (await popup(page).boundingBox())!;
  expect(control.width).toBeCloseTo(240, 0);
  expect(box.width).toBeGreaterThanOrEqual(control.width - 0.5);
  // Lined up with the control's inline-start edge, under it.
  expect(box.x).toBeCloseTo(control.x, 0);
  expect(box.y).toBeGreaterThan(control.y + control.height - 1);
  return popup(page).evaluate((el) => el.style.minInlineSize);
}

test("the popup is at least as wide as the control under controlWidth, on the anchor path @interaction", async ({ page }) => {
  expect(await popupAtLeastAsWide(page)).toBe("anchor-size(width)");
});

test("the popup is at least as wide as the control with the JS fallback forced @interaction", async ({ page }) => {
  await page.addInitScript(() => {
    const original = CSS.supports.bind(CSS);
    CSS.supports = ((...args: [string, string?]) =>
      /anchor/.test(args.join(" ")) ? false : original(...(args as [string, string]))) as typeof CSS.supports;
  });
  expect(await popupAtLeastAsWide(page, true)).toMatch(/^24\d(\.\d+)?px$/);
});

test("a long list stops at 320px, scrolls, and keeps the highlight in view while arrowing @interaction", async ({ page }) => {
  await page.goto(story("open-long-list"), { waitUntil: "networkidle" });
  const input = await openFirst(page);
  const box = (await popup(page).boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(320.5);
  expect(box.height).toBeGreaterThan(300);
  expect(await popup(page).evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

  const highlightInView = async () => {
    const id = await input.getAttribute("aria-activedescendant");
    const option = (await page.locator(`[id="${id}"]`).boundingBox())!;
    const p = (await popup(page).boundingBox())!;
    expect(option.y).toBeGreaterThanOrEqual(p.y - 0.5);
    expect(option.y + option.height).toBeLessThanOrEqual(p.y + p.height + 0.5);
    return id;
  };

  // Up from the first wraps to the last, at the bottom of the scrolled list.
  await page.keyboard.press("ArrowUp");
  expect(await highlightInView()).toMatch(/option-39$/);
  // Down wraps back to the top.
  await page.keyboard.press("ArrowDown");
  expect(await highlightInView()).toMatch(/option-0$/);
  for (let i = 0; i < 3; i++) await page.keyboard.press("PageDown");
  expect(await highlightInView()).toMatch(/option-30$/);
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowDown");
  expect(await highlightInView()).toMatch(/option-2$/);
});

test("while loading, the previous options stay and the listbox is aria-busy @interaction", async ({ page }) => {
  await page.goto(story("caller-owned"), { waitUntil: "networkidle" });
  const input = page.getByRole("combobox");
  await input.click();
  await page.keyboard.type("3");
  const listbox = page.getByRole("listbox");
  await expect(listbox).toHaveAttribute("aria-busy", "true");
  await expect(popup(page)).toContainText("Loading…");
  // The read hasn't landed: the first five items are still on screen.
  await expect(page.getByRole("option")).toHaveCount(5);
  await expect(page.getByRole("option").first()).toHaveText("Item 1");

  await expect(listbox).not.toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("option").first()).toHaveText("Item 3");
  await expect(popup(page)).toContainText("Showing 5 of 13. Keep typing to narrow it.");
  await expect(input).toHaveAttribute("aria-activedescendant", /option-0$/);
});

test("in right to left, the chevron and the clear button sit at the left @interaction", async ({ page }) => {
  await page.goto(story("right-to-left"), { waitUntil: "networkidle" });
  const root = page.locator("[data-psi-combobox]").first();
  const input = (await root.getByRole("combobox").boundingBox())!;
  const toggle = (await root.getByRole("button", { name: "Show options" }).boundingBox())!;
  const clear = (await root.getByRole("button", { name: "Clear" }).boundingBox())!;
  const control = (await root.boundingBox())!;
  expect(toggle.x + toggle.width).toBeLessThanOrEqual(input.x + 0.5);
  expect(clear.x + clear.width).toBeLessThanOrEqual(input.x + 0.5);
  // The chevron is the outermost: nearest the control's left edge.
  expect(toggle.x).toBeLessThan(clear.x);
  expect(toggle.x - control.x).toBeLessThan(12);
});

test("a Combobox inside a Dialog draws its popup above it @interaction", async ({ page }) => {
  await page.goto(story("open-in-dialog"), { waitUntil: "networkidle" });
  await openFirst(page);
  const box = (await popup(page).boundingBox())!;
  const dialog = (await page.locator("dialog[open]").boundingBox())!;
  // Test a point inside both the popup and the dialog, then one past the
  // dialog's bottom edge: the popup is hit at both.
  const insideBoth = { x: box.x + box.width / 2, y: Math.min(box.y + 20, dialog.y + dialog.height - 4) };
  const pastDialog = { x: box.x + box.width / 2, y: box.y + box.height - 8 };
  expect(pastDialog.y).toBeGreaterThan(dialog.y + dialog.height);
  for (const point of [insideBoth, pastDialog]) {
    const hit = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-psi-combobox-popup]") !== null,
      point,
    );
    expect(hit, JSON.stringify(point)).toBe(true);
  }
  // The option's accessible name joins its description (jsdom can't compute it).
  await expect(page.getByRole("option", { name: "Berlin Germany" })).toBeVisible();
});
