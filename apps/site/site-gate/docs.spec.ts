import { test, expect, type Page } from "@playwright/test";

export const BASE = "http://localhost:6210";

export async function runAxe(page: Page) {
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  return page.evaluate(async () => {
    // @ts-expect-error injected global
    const results = await axe.run(document, { resultTypes: ["violations"] });
    return results.violations.map((v: { id: string; nodes: unknown[] }) => ({
      id: v.id,
      count: v.nodes.length,
    }));
  });
}

test.describe("docs without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("/docs/ has its heading, its text and the sidebar in the HTML", async ({ page }) => {
    await page.goto(`${BASE}/docs/`);
    await expect(page.locator("h1")).toHaveText("Docs");
    await expect(page.locator(".docs-content")).toContainText("React 19 components");
    await expect(page.getByRole("navigation", { name: "Docs" })).toBeAttached();
  });
});

for (const theme of ["light", "dark"] as const) {
  test(`/docs/ has no axe violations (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("psi-theme", t), theme);
    await page.goto(`${BASE}/docs/`, { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("data-psi-theme", theme);
    expect(await runAxe(page)).toEqual([]);
  });
}

test("a copy anywhere is spoken once, through the shell's region", async ({ page }) => {
  await page.goto(`${BASE}/docs/`, { waitUntil: "networkidle" });
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("psi-site:announce", { detail: "Copied" })),
  );
  await expect(page.getByText("Copied", { exact: true })).toBeAttached();
});

test("the sidebar is open at desktop width and behind a toggle below it", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await page.goto(`${BASE}/docs/`, { waitUntil: "networkidle" });
  const sidebar = page.locator("#docs-sidebar");
  await expect(sidebar).toBeHidden();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(sidebar).toBeVisible();
  await page.setViewportSize({ width: 1300, height: 800 });
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole("button", { name: /navigation/ })).toBeHidden();
});
