import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D136 — a Dialog removed while open returns focus to its opener.
 *
 * No screenshots, so like menu.interaction.spec.ts this passes on macOS as
 * well as CI. Every test carries the @interaction tag for `pnpm test:e2e`.
 *
 * The platform restores focus to the opener on close(), and only on close():
 * a <dialog> removed while open leaves focus on <body> (measured with a bare
 * <dialog> in Chromium 149). `{open && <Dialog open />}` removes rather than
 * closes on every dismissal, so this is the path most consumers take. */

const STORY = "/iframe.html?id=components-dialog--removed-while-open&globals=theme:light";

const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return el ? "BODY" : "null";
    return `${el.tagName}:${el.textContent?.trim() ?? ""}`;
  });

async function open(page: Page) {
  await page.goto(STORY, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Edit profile" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  // The platform focused the first control inside, and remembered the opener.
  expect(await page.evaluate(() => document.activeElement?.closest("dialog") !== null)).toBe(true);
}

test("Escape on a dialog rendered as {open && …} returns focus to the opener @interaction", async ({
  page,
}) => {
  await open(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await focused(page)).toBe("BUTTON:Edit profile");
});

test("a footer button that removes the dialog returns focus to the opener @interaction", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await focused(page)).toBe("BUTTON:Edit profile");
  // Nothing of the modal is left behind: the page scrolls and is not inert.
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});
