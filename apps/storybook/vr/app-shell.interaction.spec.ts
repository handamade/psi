import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D88 — an application shell, proven in a browser.
 *
 * jsdom does no layout, no focus-visible and no scrolling, so none of this is
 * visible to the unit tests: that the skip link is invisible until Tab, that
 * Enter on it lands focus in `main`, that tabbing through a long `main` never
 * puts a focused element under the header (spec finding 4, measured with a
 * sticky header and `scroll-padding` before it was designed away), that a
 * header with no links keeps its actions at the trailing edge, that the current
 * NavItem differs from its siblings by more than colour, and that a dark
 * sidebar resolves dark tokens inside a light page. No screenshots. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;
const SHELL = "components-appshell--default";

interface Rect { top: number; bottom: number; left: number; right: number; width: number; height: number; }

const rectOf = (page: Page, selector: string): Promise<Rect> =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  });

/** The rect of the focused element, and what it is. */
const focused = (page: Page) =>
  page.evaluate(async () => {
    // Let the scroll that focus triggers settle before measuring.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const el = document.activeElement as HTMLElement;
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      id: el.id,
      text: (el.textContent ?? "").trim().slice(0, 24),
      top: r.top,
      bottom: r.bottom,
      viewport: window.innerHeight,
    };
  });

test("the skip link is invisible until Tab, then visible with a solid outline @interaction", async ({ page }) => {
  await page.goto(story(SHELL), { waitUntil: "networkidle" });
  const before = await rectOf(page, 'a[href="#main"]');
  expect(before.width).toBeLessThanOrEqual(1);
  expect(before.height).toBeLessThanOrEqual(1);

  await page.keyboard.press("Tab");
  const link = page.locator('a[href="#main"]');
  await expect(link).toBeFocused();
  const after = await rectOf(page, 'a[href="#main"]');
  expect(after.height).toBeGreaterThanOrEqual(24);
  expect(after.width).toBeGreaterThan(24);
  const outline = await link.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe("solid");
});

test("Enter on the skip link focuses main @interaction", async ({ page }) => {
  await page.goto(story(SHELL), { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const at = await focused(page);
  expect(at.tag).toBe("MAIN");
  expect(at.id).toBe("main");
  // Focused by the skip link, main draws the shared ring inside its box.
  const outline = await page.locator("main#main").evaluate((el) => {
    const cs = getComputedStyle(el);
    return { style: cs.outlineStyle, offset: parseFloat(cs.outlineOffset) };
  });
  expect(outline.style).toBe("solid");
  expect(outline.offset).toBeLessThan(0);
});

test("no tab stop in a long main is ever under the header, going down and back up @interaction", async ({ page }) => {
  await page.goto(story(SHELL), { waitUntil: "networkidle" });
  const links = await page.locator("main#main a").count();
  expect(links).toBeGreaterThanOrEqual(30); // long enough that main must scroll
  const scrolls = await page.locator("main#main").evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(scrolls).toBe(true);

  const headerBottom = (await rectOf(page, "header")).bottom;

  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter"); // skip link -> main
  const stops: Awaited<ReturnType<typeof focused>>[] = [];
  for (let i = 0; i < links; i++) {
    await page.keyboard.press("Tab");
    stops.push(await focused(page));
  }
  for (let i = 0; i < links - 1; i++) {
    await page.keyboard.press("Shift+Tab");
    stops.push(await focused(page));
  }

  // Every stop is inside main, so the walk really covered the content.
  expect(stops.every((s) => s.tag === "A")).toBe(true);
  expect(stops).toHaveLength(2 * links - 1);
  const minTop = Math.min(...stops.map((s) => s.top));
  console.log(`header bottom ${headerBottom}, min top of a focused element in main ${minTop}`);
  for (const s of stops) {
    expect(s.top, `"${s.text}" starts under the header`).toBeGreaterThanOrEqual(headerBottom);
    expect(s.bottom, `"${s.text}" ends below the viewport`).toBeLessThanOrEqual(s.viewport);
  }
});

test("a NavBar with no links keeps its actions at the trailing edge @interaction", async ({ page }) => {
  await page.goto(story("components-navbar--no-links"), { waitUntil: "networkidle" });
  const row = await rectOf(page, "header > div");
  const actions = await rectOf(page, "header button");
  expect(row.right - actions.right).toBeLessThanOrEqual(40);
  expect(actions.right).toBeLessThanOrEqual(row.right);
});

test("the current NavItem differs from its siblings in weight and surface @interaction", async ({ page }) => {
  await page.goto(story("components-navtree--default"), { waitUntil: "networkidle" });
  const read = (selector: string) =>
    page.locator(selector).first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { weight: Number(cs.fontWeight), background: cs.backgroundColor };
    });
  const current = await read('#storybook-root a[aria-current="page"]');
  const sibling = await read("#storybook-root a:not([aria-current])");
  expect(current.weight).toBeGreaterThan(sibling.weight);
  expect(current.background).not.toBe(sibling.background);
});

test("a dark sidebar resolves dark tokens inside a light page @interaction", async ({ page }) => {
  await page.goto(story(SHELL), { waitUntil: "networkidle" });
  const read = () =>
    page.evaluate(() => {
      const prop = "--psi-bg-primary";
      const sidebar = document.getElementById("sidebar") as HTMLElement;
      return {
        root: getComputedStyle(document.documentElement).getPropertyValue(prop).trim(),
        sidebar: getComputedStyle(sidebar).getPropertyValue(prop).trim(),
        painted: getComputedStyle(sidebar).backgroundColor,
      };
    });
  const { root, sidebar, painted } = await read();
  expect(root).not.toBe("");
  expect(sidebar).not.toBe("");
  expect(sidebar).not.toBe(root);
  // The theme paints nothing on its own: the sidebar paints --psi-bg-primary.
  expect(painted).not.toBe("rgba(0, 0, 0, 0)");
});
