import { test, expect, type Page } from "@playwright/test";

/** D108 — an unchecked checkbox or radio in an invalid group Field outlines in
 * the field error colour, as Input does; a checked one keeps its accent.
 * Before D108 both kept --psi-border-control. jsdom has no cascade, so the
 * unit tests read the rules; this reads what the browser computes. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

const outline = (page: Page, name: string) =>
  page.getByRole("checkbox", { name }).or(page.getByRole("radio", { name })).evaluate((input) => {
    const mark = input.nextElementSibling as HTMLElement;
    return getComputedStyle(mark).borderTopColor;
  });

const errorColour = (page: Page, text: string) =>
  page.getByText(text).evaluate((el) => getComputedStyle(el).color);

test("unchecked radios in an invalid Field outline in the error colour @interaction", async ({ page }) => {
  await page.goto(story("components-radiogroup--with-error"), { waitUntil: "networkidle" });
  const danger = await errorColour(page, "Pick a category.");
  expect(await outline(page, "Something is broken")).toBe(danger);
  expect(await outline(page, "An idea")).toBe(danger);
});

test("unchecked checkboxes in an invalid Field outline in the error colour, a ticked one keeps its accent @interaction", async ({ page }) => {
  await page.goto(story("components-checkbox--invalid-group"), { waitUntil: "networkidle" });
  const danger = await errorColour(page, "Pick at least two.");
  expect(await outline(page, "SMS")).toBe(danger);
  expect(await outline(page, "Push")).toBe(danger);
  expect(await outline(page, "Email")).not.toBe(danger);
  await expect(page.getByRole("checkbox", { name: "SMS" })).toHaveAttribute("aria-invalid", "true");
});
