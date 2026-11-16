import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

import { BASE, runAxe } from "./helpers";

const TOKEN_SLUGS = ["color", "typography", "display", "spacing", "motion", "layout"];
const GUIDE_IDS = ["installation", "theming", "dark-mode", "ai", "sizes-and-variants"];


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

function componentSlugs(): string[] {
  const src = readFileSync("apps/site/src/content/component-pages.ts", "utf8");
  return [...src.matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]);
}

test.describe("component pages without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the Color tokens page has every semantic colour in the HTML", async ({ page }) => {
    await page.goto(`${BASE}/docs/tokens/color/`);
    await expect(page.locator("h1")).toHaveText("Color tokens");
    await expect(page.locator(".docs-content")).toContainText("--psi-bg-primary");
  });

  test("the installation guide is in the HTML", async ({ page }) => {
    await page.goto(`${BASE}/docs/get-started/installation/`);
    await expect(page.locator("h1")).toHaveText("Installation");
    await expect(page.locator(".docs-content")).toContainText("utilities.css");
  });

  test("Button's page has its heading, an example's code and the props in the HTML", async ({ page }) => {
    await page.goto(`${BASE}/docs/components/button/`);
    await expect(page.locator("h1")).toHaveText("Button");
    await expect(page.locator(".docs-content")).toContainText('variant="accent"');
    await expect(page.locator("table").first()).toContainText("24 | 32 | 40 | 48");
  });
});

test("every component page exists and has no axe violations, light and dark", async ({ page }) => {
  test.setTimeout(600_000);
  for (const slug of componentSlugs()) {
    for (const theme of ["light", "dark"] as const) {
      await page.addInitScript((t) => localStorage.setItem("psi-theme", t), theme);
      const res = await page.goto(`${BASE}/docs/components/${slug}/`, { waitUntil: "networkidle" });
      expect(res?.status(), slug).toBe(200);
      expect(await runAxe(page), `${slug} (${theme})`).toEqual([]);
    }
  }
});

test("every token page exists and has no axe violations, light and dark", async ({ page }) => {
  test.setTimeout(300_000);
  for (const slug of TOKEN_SLUGS) {
    for (const theme of ["light", "dark"] as const) {
      await page.addInitScript((t) => localStorage.setItem("psi-theme", t), theme);
      const res = await page.goto(`${BASE}/docs/tokens/${slug}/`, { waitUntil: "networkidle" });
      expect(res?.status(), slug).toBe(200);
      expect(await runAxe(page), `${slug} (${theme})`).toEqual([]);
    }
  }
});

test("every guide exists and has no axe violations, light and dark", async ({ page }) => {
  test.setTimeout(300_000);
  for (const id of GUIDE_IDS) {
    for (const theme of ["light", "dark"] as const) {
      await page.addInitScript((t) => localStorage.setItem("psi-theme", t), theme);
      const res = await page.goto(`${BASE}/docs/get-started/${id}/`, { waitUntil: "networkidle" });
      expect(res?.status(), id).toBe(200);
      expect(await runAxe(page), `${id} (${theme})`).toEqual([]);
    }
  }
});

test("no internal link on a docs page points at a missing page", async ({ page, request }) => {
  test.setTimeout(300_000);
  const pages = [
    "/docs/",
    ...componentSlugs().map((s) => `/docs/components/${s}/`),
    ...TOKEN_SLUGS.map((s) => `/docs/tokens/${s}/`),
    ...GUIDE_IDS.map((id) => `/docs/get-started/${id}/`),
  ];
  const seen = new Set<string>();
  const broken: string[] = [];
  for (const path of pages) {
    await page.goto(`${BASE}${path}`);
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLAnchorElement>("a[href]")]
        .map((a) => new URL(a.href, location.href))
        .filter((u) => u.origin === location.origin && !u.pathname.startsWith("/storybook/"))
        .map((u) => u.pathname),
    );
    for (const href of hrefs) {
      if (seen.has(href)) continue;
      seen.add(href);
      const r = await request.get(`${BASE}${href}`);
      if (r.status() !== 200) broken.push(`${path} → ${href} (${r.status()})`);
    }
  }
  expect(broken).toEqual([]);
});

test("one page of each type fits 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of [
    "/docs/",
    "/docs/components/table/",
    "/docs/tokens/color/",
    "/docs/get-started/installation/",
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(scrollW, path).toBe(clientW);
  }
});

test("code on docs pages is coloured only through variables", async ({ page }) => {
  for (const path of ["/docs/get-started/installation/", "/docs/components/button/"]) {
    await page.goto(`${BASE}${path}`);
    const styles = await page.$$eval("pre [style], pre[style]", (els) => els.map((e) => e.getAttribute("style") ?? ""));
    expect(styles.filter((s) => /#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i.test(s)), path).toEqual([]);
  }
});
