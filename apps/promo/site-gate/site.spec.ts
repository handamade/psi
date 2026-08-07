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
    expect(await runAxe(page)).toEqual([]);
  });
}

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
