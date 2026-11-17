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

test("the sidebar is open at desktop width and behind the Menu below it", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await page.goto(`${BASE}/docs/`, { waitUntil: "networkidle" });
  const sidebar = page.locator("#docs-sidebar");
  await expect(sidebar).toBeHidden();
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
  await page.setViewportSize({ width: 1300, height: 800 });
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
});

function componentSlugs(): string[] {
  const src = readFileSync("packages/docs/src/pages.ts", "utf8").split("export interface TokenPage")[0];
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

// Paths that tools/assemble-site.mjs adds after the site build, so they are absent
// from apps/site/dist, which this gate serves. Links to them are correct in production.
const ASSEMBLED_PATHS = ["/storybook/", "/llms.txt", "/packages/"];

test("no internal link on a docs page points at a missing page", async ({ page, request }) => {
  test.setTimeout(300_000);
  const pages = [
    "/",
    "/docs/",
    ...componentSlugs().map((s) => `/docs/components/${s}/`),
    ...TOKEN_SLUGS.map((s) => `/docs/tokens/${s}/`),
    ...GUIDE_IDS.map((id) => `/docs/get-started/${id}/`),
  ];
  const seen = new Set<string>();
  const broken: string[] = [];
  for (const path of pages) {
    await page.goto(`${BASE}${path}`);
    const hrefs = await page.evaluate(
      (assembled) =>
        [...document.querySelectorAll("a[href]")]
          .map((a) => new URL(a.getAttribute("href")!, location.href))
          .filter((u) => u.origin === location.origin && !assembled.some((p) => u.pathname.startsWith(p)))
          .map((u) => u.pathname),
      ASSEMBLED_PATHS,
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

test("every docs page fits 320px, in the document and in the main scroller", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 320, height: 800 });
  const paths = [
    "/docs/",
    ...componentSlugs().map((s) => `/docs/components/${s}/`),
    ...TOKEN_SLUGS.map((s) => `/docs/tokens/${s}/`),
    ...GUIDE_IDS.map((id) => `/docs/get-started/${id}/`),
  ];
  const over: string[] = [];
  for (const path of paths) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    // AppShell's <main> is its own overflow:auto scroller, so the document
    // never sees what overflows inside it.
    const m = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>("main#main")!;
      return {
        docS: document.documentElement.scrollWidth,
        docC: document.documentElement.clientWidth,
        mainS: main.scrollWidth,
        mainC: main.clientWidth,
      };
    });
    if (m.docS > m.docC || m.mainS > m.mainC) over.push(`${path} doc ${m.docS}/${m.docC} main ${m.mainS}/${m.mainC}`);
  }
  expect(over).toEqual([]);
});

test.describe("at 375px", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("main takes the width and the dead sidebar column is not drawn", async ({ page }) => {
      await page.goto(`${BASE}/docs/`);
      const width = await page.locator("main#main").evaluate((el) => el.getBoundingClientRect().width);
      expect(width).toBeGreaterThanOrEqual(300);
      await expect(page.locator("#docs-sidebar")).toBeHidden();
    });
  });

  test("one page of each type has no axe violations", async ({ page }) => {
    test.setTimeout(120_000);
    for (const path of [
      "/docs/",
      "/docs/components/tabs/",
      "/docs/tokens/color/",
      "/docs/tokens/typography/",
      "/docs/get-started/installation/",
    ]) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      expect(await runAxe(page), path).toEqual([]);
    }
  });
});

test("a code view's copy button does not sit on its code", async ({ page }) => {
  await page.goto(`${BASE}/docs/components/table/`, { waitUntil: "networkidle" });
  const view = page.locator(".code-view").first();
  const copy = await view.getByRole("button", { name: /^Copy/ }).first().boundingBox();
  const pre = await view.locator("pre").first().boundingBox();
  expect(copy).not.toBeNull();
  expect(pre).not.toBeNull();
  const apart = copy!.y + copy!.height <= pre!.y || pre!.y + pre!.height <= copy!.y;
  expect(apart, `copy ${JSON.stringify(copy)} pre ${JSON.stringify(pre)}`).toBe(true);
});

test("a heading's accessible name is its text, and its anchor is named for it", async ({ page }) => {
  await page.goto(`${BASE}/docs/components/button/`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Examples", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Link to Examples" })).toBeAttached();
});

test("the search index leaves out example previews, Copy page and anchors", async ({ page }) => {
  await page.goto(`${BASE}/docs/`, { waitUntil: "networkidle" });
  const content = await page.evaluate(async () => {
    // @ts-expect-error served by pagefind at runtime
    const pf = await import("/pagefind/pagefind.js");
    await pf.init();
    const found = await pf.search("button");
    const data = await Promise.all(found.results.slice(0, 5).map((r: { data(): Promise<{ content: string }> }) => r.data()));
    return data.map((d) => d.content).join("\n");
  });
  expect(content.length).toBeGreaterThan(100);
  expect(content).not.toContain("Copy page");
  expect(content).not.toContain("Link to");
});

test("code on docs pages is coloured only through variables", async ({ page }) => {
  for (const path of ["/docs/get-started/installation/", "/docs/components/button/"]) {
    await page.goto(`${BASE}${path}`);
    const styles = await page.$$eval("pre [style], pre[style]", (els) => els.map((e) => e.getAttribute("style") ?? ""));
    expect(styles.filter((s) => /#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i.test(s)), path).toEqual([]);
  }
});

test("a guide's code block has a box and a component page's code view has none", async ({ page }) => {
  await page.goto(`${BASE}/docs/get-started/installation/`);
  const guide = await page.locator(".docs-content > pre").first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { border: s.borderTopWidth, bg: s.backgroundColor };
  });
  expect(guide.border).toBe("1px");
  expect(guide.bg).not.toBe("rgba(0, 0, 0, 0)");
  await page.goto(`${BASE}/docs/components/button/`);
  const inner = await page.locator(".code-view pre").first().evaluate((el) => getComputedStyle(el).borderTopWidth);
  expect(inner).toBe("0px");
});

test("every docs page has a markdown twin, and /docs/llms.txt lists exactly them", async ({ request }) => {
  const llms = await (await request.get(`${BASE}/docs/llms.txt`)).text();
  const listed = [...llms.matchAll(/\]\(https:\/\/psi\.kurkin\.de(\/docs\/[^)]+\.md)\)/g)].map((m) => m[1]);
  const expected = [
    "/docs/index.md",
    ...GUIDE_IDS.map((g) => `/docs/get-started/${g}.md`),
    "/docs/changelog.md",
    ...componentSlugs().map((s) => `/docs/components/${s}.md`),
    ...TOKEN_SLUGS.map((s) => `/docs/tokens/${s}.md`),
  ];
  expect([...listed].sort()).toEqual([...expected].sort());
  for (const url of expected) {
    const r = await request.get(`${BASE}${url}`);
    expect(r.status(), url).toBe(200);
    expect((await r.text()).length, url).toBeGreaterThan(100);
  }
});

test("each docs page links its twin", async ({ page }) => {
  await page.goto(`${BASE}/docs/components/button/`);
  await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveAttribute(
    "href",
    "/docs/components/button.md",
  );
});

test("Copy page copies the page as markdown", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${BASE}/docs/components/button/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Copy page" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.startsWith("# Button\n")).toBe(true);
});

test("⌘K finds the Button page", async ({ page }) => {
  await page.goto(`${BASE}/docs/`, { waitUntil: "networkidle" });
  await page.keyboard.press("ControlOrMeta+k");
  const input = page.getByRole("searchbox", { name: "Search the docs" });
  await expect(input).toBeFocused();
  await input.fill("button");
  await expect(page.getByRole("link", { name: /^Button/ }).first()).toBeVisible();
});

test("a search that matches nothing says so once it has settled", async ({ page }) => {
  await page.goto(`${BASE}/docs/`, { waitUntil: "networkidle" });
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("searchbox", { name: "Search the docs" }).fill("zzqxv");
  await expect(page.locator(".search-empty", { hasText: "No results" })).toBeVisible();
});

test("a failed index load says so, and the next search retries it", async ({ page }) => {
  await page.goto(`${BASE}/docs/`, { waitUntil: "networkidle" });
  await page.route("**/pagefind/pagefind.js", (r) => r.abort());
  await page.keyboard.press("ControlOrMeta+k");
  const input = page.getByRole("searchbox", { name: "Search the docs" });
  await input.fill("button");
  await expect(page.locator(".search-empty", { hasText: "Search is unavailable" })).toBeVisible();
  await page.unroute("**/pagefind/pagefind.js");
  await input.fill("buttons");
  await expect(page.getByRole("link", { name: /^Button/ }).first()).toBeVisible();
});

test("the MCP's get returns exactly each docs page's markdown twin (D129)", async ({ request }) => {
  // test:site runs from the repo root, after `pnpm build`.
  const index = JSON.parse(readFileSync("packages/mcp/dist/psi-index.json", "utf8")) as {
    docs: {
      overview: string;
      components: Record<string, { markdown: string }>;
      tokenPages: Record<string, { markdown: string }>;
      guides: Record<string, { markdown: string }>;
    };
  };
  const pairs: Array<[string, string]> = [
    ["/docs/index.md", index.docs.overview],
    ...Object.entries(index.docs.components).map(([s, p]) => [`/docs/components/${s}.md`, p.markdown] as [string, string]),
    ...Object.entries(index.docs.tokenPages).map(([s, p]) => [`/docs/tokens/${s}.md`, p.markdown] as [string, string]),
    ...Object.entries(index.docs.guides).map(([g, p]) => [`/docs/get-started/${g}.md`, p.markdown] as [string, string]),
  ];
  expect(pairs.length).toBeGreaterThan(40);
  for (const [url, markdown] of pairs) {
    const res = await request.get(`${BASE}${url}`);
    expect(res.status(), url).toBe(200);
    expect(await res.text(), url).toBe(markdown);
  }
});
