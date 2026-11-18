import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D136 — dismissing the toast that holds focus does not drop focus to the
 * page. Focus moves to the toast now at the dismissed one's position (the new
 * last, if it was last), and once the stack is empty, back to the element
 * that had focus before focus entered the region.
 *
 * No screenshots, so like menu.interaction.spec.ts this passes on macOS as
 * well as CI. Every test carries the @interaction tag for `pnpm test:e2e`. */

const STORY = "/iframe.html?id=feedback-toast--dismiss-focused&globals=theme:light";

const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return el ? "BODY" : "null";
    const toast = el.closest("[data-psi-toast]");
    if (toast) return `${el.getAttribute("aria-label")} in ${toast.textContent?.trim()}`;
    return `${el.tagName}:${el.textContent?.trim() ?? ""}`;
  });

async function raise(page: Page, n: number) {
  await page.goto(STORY, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Save draft" }).focus();
  for (let i = 0; i < n; i++) await page.keyboard.press("Enter");
  await expect(page.locator("[data-psi-toast]")).toHaveCount(n);
}

test("Enter on a focused toast's dismiss moves focus to the next toast, then back to the opener @interaction", async ({
  page,
}) => {
  await raise(page, 2);
  await page.keyboard.press("Tab");
  expect(await focused(page)).toBe("Dismiss notification in Draft 1 saved.");

  await page.keyboard.press("Enter");
  await expect(page.locator("[data-psi-toast]")).toHaveCount(1);
  expect(await focused(page)).toBe("Dismiss notification in Draft 2 saved.");

  await page.keyboard.press("Enter");
  await expect(page.locator("[data-psi-toast]")).toHaveCount(0);
  expect(await focused(page)).toBe("BUTTON:Save draft");
});

test("dismissing the last toast in the stack moves focus to the new last @interaction", async ({
  page,
}) => {
  await raise(page, 3);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  expect(await focused(page)).toBe("Dismiss notification in Draft 3 saved.");

  await page.keyboard.press("Enter");
  await expect(page.locator("[data-psi-toast]")).toHaveCount(2);
  expect(await focused(page)).toBe("Dismiss notification in Draft 2 saved.");
});

test("a focused toast evicted by a new one hands focus to the toast now at its position @interaction", async ({
  page,
}) => {
  // The queue removing a toast on its own, as a timer would: at the limit (3)
  // the oldest is evicted. element.click() raises a fourth without moving
  // focus out of the first.
  await raise(page, 3);
  await page.keyboard.press("Tab");
  expect(await focused(page)).toBe("Dismiss notification in Draft 1 saved.");

  await page.evaluate(() =>
    [...document.querySelectorAll("button")].find((b) => b.textContent === "Save draft")!.click(),
  );
  await expect(page.locator("[data-psi-toast]")).toHaveCount(3);
  await expect(page.locator("[data-psi-toast]").first()).toContainText("Draft 2 saved.");
  await expect.poll(() => focused(page)).toBe("Dismiss notification in Draft 2 saved.");
});

test("a mouse click on a toast's dismiss returns focus to where it came from, toasts left or not @interaction", async ({
  page,
}) => {
  // A pointer user is leaving the stack: focus left in the next toast would
  // hold the provider's timers paused after the pointer has gone.
  await raise(page, 2);
  await page.locator("[data-psi-toast]").first().getByRole("button", { name: "Dismiss notification" }).click();
  await expect(page.locator("[data-psi-toast]")).toHaveCount(1);
  expect(await focused(page)).toBe("BUTTON:Save draft");
});
