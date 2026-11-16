import { test, expect } from "@playwright/test";

/** D116 — a theme declares its color-scheme, so the browser draws its own
 * parts (a date field's picker icon, select lists, scrollbars) for that
 * scheme. jsdom computes no color-scheme, so this runs in a browser. Computed
 * values only: the Input `DateField` story's screenshots show the icon. */

for (const [theme, expected] of [["light", "light"], ["ember", "dark"]] as const) {
  test(`the page and a date field take ${expected} under ${theme} @interaction`, async ({ page }) => {
    await page.goto(`/iframe.html?id=components-input--date-field&globals=theme:${theme}`, { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("data-psi-theme", theme);
    const root = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    const field = await page.locator('input[type="date"]').evaluate((el) => getComputedStyle(el).colorScheme);
    expect(root).toBe(expected);
    expect(field).toBe(expected);
  });
}

test("a dark sidebar in a light page takes dark, while main stays light @interaction", async ({ page }) => {
  await page.goto("/iframe.html?id=components-appshell--default&globals=theme:light", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-psi-theme", "light");
  const scheme = (selector: string) =>
    page.locator(selector).first().evaluate((el) => getComputedStyle(el).colorScheme);
  expect(await scheme("#sidebar")).toBe("dark");
  expect(await scheme("main")).toBe("light");
});
