import { test, expect } from "@playwright/test";

import { BASE as ORIGIN, runAxe } from "./helpers";

const BASE = `${ORIGIN}/`;

for (const theme of ["light", "dark"] as const) {
  test(`no axe violations (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("psi-theme", t), theme);
    await page.goto(BASE, { waitUntil: "networkidle" });
    // Prove the seed actually took. Without this, a future key rename would
    // leave both runs on the same appearance and pass anyway (D57).
    await expect(page.locator("html")).toHaveAttribute("data-psi-theme", theme);
    expect(await runAxe(page)).toEqual([]);
  });
}

/**
 * The hero's derive labels, measured directly — because axe structurally cannot.
 *
 * `.hero::before` / `::after` (the blueprint grid and the accent glow) mean axe
 * cannot determine an effective background for anything in the hero, so it files
 * all 34 hero nodes under `incomplete` rather than `violations` — the derive
 * labels among them. Asserting on `incomplete` was tried and rejected: it cannot
 * tell "a real failure axe couldn't measure" from "a decorative pseudo-element".
 *
 * These labels used to sit ON the accent swatches: measured 4.38:1 at rest and
 * 2.88:1 with the Δ slider at maximum — a contrast demo that failed contrast.
 * Task 8 moved them onto the panel. If anyone moves them back, the effective
 * background becomes the accent fill again and this fails. (D76)
 */
test("the hero's derive labels clear AA at both slider extremes", async ({ page }) => {
  await page.goto(BASE, { waitUntil: "networkidle" });

  const measure = () =>
    page.evaluate(() => {
      // getComputedStyle returns OKLCH verbatim for these tokens, so parse it.
      const oklchToSrgb = (L: number, C: number, H: number) => {
        const h = (H * Math.PI) / 180;
        const a = C * Math.cos(h);
        const bb = C * Math.sin(h);
        const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
        const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
        const s = (L - 0.0894841775 * a - 1.291485548 * bb) ** 3;
        const lin = [
          4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
        ];
        return lin.map((x) => {
          const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(x, 0), 1 / 2.4) - 0.055;
          return Math.min(1, Math.max(0, v)) * 255;
        });
      };

      /** Throws on an unrecognised format — a silent pass would defeat the test. */
      const parse = (css: string): [number, number, number, number] => {
        const n = css.match(/-?[\d.]+%?/g)?.map((v) =>
          v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v),
        );
        if (!n) throw new Error(`unparseable color: ${css}`);
        if (css.startsWith("rgb")) return [n[0], n[1], n[2], n[3] ?? 1];
        if (css.startsWith("oklch")) {
          const [r, g, b] = oklchToSrgb(n[0], n[1], n[2]);
          return [r, g, b, n[3] ?? 1];
        }
        throw new Error(`unsupported color format, cannot verify contrast: ${css}`);
      };

      const over = (fg: number[], bg: number[]) =>
        fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));

      const lum = (rgb: number[]) => {
        const a = rgb.map((v) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
      };

      /** Walk ancestors compositing every translucent layer, so a label on a
       *  swatch resolves against the swatch, not the page. */
      const effectiveBg = (el: Element): number[] => {
        const layers: number[][] = [];
        for (let n: Element | null = el; n; n = n.parentElement) {
          const c = parse(getComputedStyle(n).backgroundColor);
          if (c[3] > 0) layers.push(c);
          if (c[3] === 1) break;
        }
        return layers.reduceRight((acc, c) => over(c, acc), [255, 255, 255]);
      };

      const labels = [...document.querySelectorAll(".derive-cell .annot")];
      return labels.map((el) => {
        const bg = effectiveBg(el);
        const fg = over(parse(getComputedStyle(el).color), bg);
        const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
        return {
          text: el.textContent?.trim() ?? "",
          ratio: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100,
        };
      });
    });

  const atRest = await measure();
  expect(atRest.length, "no derive labels found — the widget moved or was removed").toBe(3);
  for (const { text, ratio } of atRest) {
    expect(ratio, `derive label "${text}" at rest measures ${ratio}:1`).toBeGreaterThanOrEqual(4.5);
  }

  // Drag Δ to its maximum: the swatches lighten, and if a label were on one it
  // would fail here even when it passed at rest.
  await page.locator(".derive-controls input[type=range]").evaluate((el: HTMLInputElement) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(el, el.max);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(150);

  for (const { text, ratio } of await measure()) {
    expect(ratio, `derive label "${text}" at max Δ measures ${ratio}:1`).toBeGreaterThanOrEqual(4.5);
  }
});

// The counts must be right *on the page*, not just in source. check-docs-drift
// can only see source text, so it cannot catch a stat line being deleted or an
// interpolation rewired to the wrong fact. Only a rendered assertion closes that.
test("the rendered page states the package's real counts", async ({ page }) => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  const { readFileSync } = await import("node:fs");
  const manifest = JSON.parse(readFileSync("packages/react/dist/manifest.json", "utf8")) as { components: unknown[] };
  const body = await page.locator("body").innerText();
  expect(body).toContain(`All ${manifest.components.length} components`);
  expect(body).toMatch(/\d+ decisions so far/);
});

// Every Storybook link the site generates must resolve to a real docs page —
// three of them 404'd when the roster was first derived (Task 3 finding I1).
// Checking the URL *shape* (starts with "/docs/") is not enough: a link with
// the right shape but a wrong story id is exactly the 404 class I1 was about,
// and it would still pass a shape-only check. So this reads Storybook's own
// build index — a JSON manifest of every real story/docs id — and asserts
// every id the site generates is actually present in it.
test("no Storybook link points at a missing docs page", async ({ page }) => {
  const { readFileSync, existsSync } = await import("node:fs");
  const indexPath = "apps/storybook/storybook-static/index.json";
  if (!existsSync(indexPath)) {
    throw new Error(
      `${indexPath} is missing. Run \`pnpm build\` first — this test needs ` +
        "the Storybook static build's index to check generated links against.",
    );
  }
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    entries: Record<string, unknown>;
  };
  const knownIds = new Set(Object.keys(index.entries));
  expect(knownIds.size).toBeGreaterThan(0);

  await page.goto(BASE, { waitUntil: "networkidle" });
  // getAttribute, not `.href`: the map's <a> elements are SVG, whose `.href` is an object.
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll("a[href*='?path=/docs/']")].map(
      (a) => new URL(a.getAttribute("href")!, location.href).searchParams.get("path") ?? "",
    ),
  );
  expect(ids.length).toBeGreaterThan(0);
  expect(ids.filter((id) => !id.startsWith("/docs/"))).toEqual([]);

  const missing = ids
    .map((id) => id.replace(/^\/docs\//, ""))
    .filter((id) => !knownIds.has(id));
  expect(missing, "generated ids missing from the Storybook build index").toEqual([]);
});

// 320 is the WCAG reflow floor. 760 sits inside the band where the nav is still
// shown but no longer fits — the failure the 720px breakpoint alone missed.
for (const width of [320, 760, 1440]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(BASE, { waitUntil: "networkidle" });
    const { scrollW, clientW, offenders } = await page.evaluate(() => {
      const clientW = document.documentElement.clientWidth;
      const offenders: string[] = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > clientW + 1) {
          offenders.push(
            `${el.tagName}.${String(el.className).split(" ")[0]}@${Math.round(r.right)}`,
          );
        }
      }
      return {
        scrollW: document.documentElement.scrollWidth,
        clientW,
        offenders: [...new Set(offenders)].slice(0, 5),
      };
    });
    expect(offenders, `elements past the viewport edge at ${width}px`).toEqual([]);
    expect(scrollW).toBe(clientW);
  });
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every section is in the HTML", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator("h1")).toHaveCount(1);
    for (const h of ["One source, every surface", "Built only from Psi", "How it's built"]) {
      await expect(page.getByRole("heading", { level: 2, name: h })).toBeVisible();
    }
    await expect(page.locator("main")).toContainText("variant"); // the trace's default Docs excerpt
    // Canopy is a framed example: the homepage holds the iframe, the frame is a static page.
    const frame = page.locator('main iframe[src*="/docs/examples/showcase/canopy/"]');
    await expect(frame).toHaveCount(1);
    expect(((await frame.getAttribute("title")) ?? "").trim().length).toBeGreaterThan(0);
  });

  test("the Canopy frame page server-renders its zone table", async ({ page }) => {
    await page.goto(`${BASE}docs/examples/showcase/canopy/`);
    expect(await page.content()).toContain("B · Basil");
  });
});

for (const theme of ["light", "dark"] as const) {
  test(`the Canopy frame page has no axe violations (${theme})`, async ({ page }) => {
    await page.goto(`${BASE}docs/examples/showcase/canopy/?theme=${theme}`, { waitUntil: "networkidle" });
    expect(await runAxe(page)).toEqual([]);
  });
}

test("the header links pages, never fragments", async ({ page }) => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  const hrefs = await page.locator("header.site-header a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  expect(hrefs.length).toBeGreaterThan(0);
  expect(hrefs.filter((h) => h?.includes("#"))).toEqual([]);
});

test.describe("at 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("no axe violations, light and dark", async ({ page }) => {
    for (const theme of ["light", "dark"] as const) {
      await page.addInitScript((t) => localStorage.setItem("psi-theme", t), theme);
      await page.goto(BASE, { waitUntil: "networkidle" });
      expect(await runAxe(page), theme).toEqual([]);
    }
  });

  test("the bottom bar's targets are at least 48px, and Menu opens and closes the drawer", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    const bar = page.getByRole("navigation", { name: "Site, bottom" });
    for (const h of await bar.locator("a, button").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
      expect(h).toBeGreaterThanOrEqual(48);
    }
    const menu = page.getByRole("button", { name: "Menu" });
    await menu.click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
    await expect(menu).toBeFocused();
  });

  test("Map shows first, and a surface on the map opens the trace on it", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    // The trace island hydrates when visible (client:visible); scroll to it first.
    await page.getByRole("heading", { level: 2, name: "One source, every surface" }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("tab", { name: "Map" })).toBeVisible();
    await page.locator('a[data-surface="mcp"]').click();
    await expect(page.getByRole("tab", { name: "Trace" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "MCP" })).toHaveAttribute("aria-selected", "true");
  });

  test("the same bottom bar on a docs page", async ({ page }) => {
    await page.goto(`${BASE}docs/`, { waitUntil: "networkidle" });
    await expect(page.getByRole("navigation", { name: "Site, bottom" })).toBeVisible();
  });

  test("a docs page's last content clears the bottom bar", async ({ page }) => {
    await page.goto(`${BASE}docs/components/button/`, { waitUntil: "networkidle" });
    const m = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>("main#main")!;
      main.scrollTop = main.scrollHeight;
      const bar = document.querySelector<HTMLElement>('nav[aria-label="Site, bottom"]')!;
      let last: Element = main;
      while (last.lastElementChild) last = last.lastElementChild;
      return { lastBottom: last.getBoundingClientRect().bottom, barTop: bar.getBoundingClientRect().top };
    });
    expect(m.lastBottom).toBeLessThanOrEqual(m.barTop);
  });
});

test("every trace Storybook link names a story Storybook built", async ({ page }) => {
  const { readFileSync } = await import("node:fs");
  const index = JSON.parse(readFileSync("apps/storybook/storybook-static/index.json", "utf8")) as { entries: Record<string, unknown> };
  await page.goto(BASE, { waitUntil: "networkidle" });
  const hrefs = await page.locator('a[href*="?path=/docs/"]').evaluateAll((as) => as.map((a) => new URL(a.getAttribute("href")!, location.href).href));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    const id = new URL(href).searchParams.get("path")!.replace(/^\/docs\//, "");
    expect(Object.keys(index.entries), href).toContain(id);
  }
});

test("hydrating the homepage logs no errors, with a stored dark mode and brand", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem("psi-theme", "dark"));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-psi-theme", "dark");
  await expect(page.getByRole("radio", { name: "Dark" }).first()).toHaveAttribute("aria-checked", "true");
  expect(errors).toEqual([]);
});
