import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:6210/";

/** axe-core ships in the repo root's node_modules; addScriptTag resolves from cwd. */
async function runAxe(page: Page) {
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
 * The Theming section's three cards each declare their own data-psi-theme, so
 * an element's own rule beats an inherited value and they stay pinned under a
 * console-derived theme. Those cards ARE the attribute-scoping argument — if a
 * generated theme swallowed them the section would refute itself (D57).
 */
test("a derived theme does not repaint the pinned Theming cards", async ({ page }) => {
  await page.goto(BASE, { waitUntil: "networkidle" });

  const cardBg = () =>
    page.evaluate(() => {
      const card = document.querySelector('[data-psi-theme="acme"]');
      return card ? getComputedStyle(card).backgroundColor : null;
    });

  const before = await cardBg();
  expect(before).not.toBeNull();

  // Apply an extreme brand directly to <html>, as the console does.
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--psi-bg-primary", "#ff00ff");
    document.documentElement.dataset.psiCustom = "";
  });
  // `body` carries `transition: background-color var(--psi-duration-200)`
  // (200ms) — reading immediately would measure a mid-transition frame
  // instead of the applied color, so wait past it.
  await page.waitForTimeout(300);

  expect(await cardBg()).toBe(before);

  // …and prove the page around them DID move, or the test proves nothing.
  // Every token here is OKLCH-based end to end, and Chromium's computed
  // style keeps a transitioned background-color in oklab() notation rather
  // than converting it back to rgb() — a plain string match for
  // "255, 0, 255" would never pass regardless of the wait above. Rasterize
  // it through a canvas instead: that always yields real 0–255 sRGB
  // channels no matter which colour-function syntax the computed style used.
  const bodyRgb = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
  });
  expect(bodyRgb).toEqual({ r: 255, g: 0, b: 255 });
});

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
// can only see source text, so it cannot catch the stat line being deleted, or
// an interpolation rewired to the wrong fact (`${iconCount} components`), or a
// spelled-out word like the "Eighteen production components" heading that
// started this. Only a rendered assertion closes those. (Task 3 review finding.)
test("the rendered page states the package's real counts", async ({ page }) => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  const { readFileSync } = await import("node:fs");
  const manifest = JSON.parse(
    readFileSync("packages/react/dist/manifest.json", "utf8"),
  ) as { components: unknown[]; icons: string[] };

  const body = await page.locator("body").innerText();
  expect(body).toContain(`${manifest.components.length} components`);
  expect(body).toContain(`${manifest.icons.length} icons`);
  expect(body).not.toMatch(/\bEighteen\b/i);
});

// Every Storybook link the site generates must resolve to a real docs page —
// three of them 404'd when the roster was first derived (Task 3 finding I1).
// Checking the URL *shape* (starts with "/docs/") is not enough: a link with
// the right shape but a wrong story id is exactly the 404 class I1 was about,
// and it would still pass a shape-only check. So this reads Storybook's own
// build index — a JSON manifest of every real story/docs id — and asserts
// every id the promo page generates is actually present in it.
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
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>("a[href*='/docs/']")].map(
      (a) => new URL(a.href, location.href).searchParams.get("path") ?? "",
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
