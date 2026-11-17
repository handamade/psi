import { test, expect } from "@playwright/test";

/** D123 — a docs page's story box is an app root. The theme toolbar sets
 * `data-psi-theme` on <html>, and the canvas paints its body with the theme's
 * background. On a docs page, Storybook's own wrapper and preview box paint
 * white over it, so before D123 a Dark story rendered dark-theme foregrounds
 * on white (reported on the Switch page: a light-grey label on white).
 *
 * Every `.docs-story` must paint the active theme's bg-primary and take its
 * fg-primary, in every theme. */

const THEMES = ["light", "dark", "acme", "ember"] as const;
const DOCS = "components-switch--docs";

for (const theme of THEMES) {
  test(`${DOCS} story boxes follow the ${theme} theme @interaction`, async ({ page }) => {
    await page.goto(`/iframe.html?viewMode=docs&id=${DOCS}&globals=theme:${theme}`, { waitUntil: "load" });
    await page.locator(".docs-story [role=switch]").first().waitFor();
    const result = await page.evaluate(() => {
      // Resolve the tokens to computed colours through probes, so the
      // comparison is between two computed values in the same format.
      const resolve = (prop: "backgroundColor" | "color", token: string) => {
        const probe = document.createElement("div");
        probe.style[prop] = `var(${token})`;
        document.body.append(probe);
        const value = getComputedStyle(probe)[prop];
        probe.remove();
        return value;
      };
      const boxes = [...document.querySelectorAll<HTMLElement>(".docs-story")];
      return {
        theme: document.documentElement.dataset.psiTheme,
        bg: resolve("backgroundColor", "--psi-bg-primary"),
        fg: resolve("color", "--psi-fg-primary"),
        boxes: boxes.map((b) => ({ bg: getComputedStyle(b).backgroundColor, fg: getComputedStyle(b).color })),
      };
    });
    expect(result.theme).toBe(theme);
    expect(result.boxes.length).toBeGreaterThan(0);
    for (const box of result.boxes) expect(box).toEqual({ bg: result.bg, fg: result.fg });
  });
}
