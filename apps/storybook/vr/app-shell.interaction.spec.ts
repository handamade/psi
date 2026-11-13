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

  // The frame is the page: if the document scrolled too, the header would
  // slide and the measurement below would mean nothing.
  const documentScrolls = await page.evaluate(
    () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
  );
  expect(documentScrolls).toBe(false);

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
  // 1px of slack for sub-pixel scroll rounding: the browser snaps main's
  // scroll offset to whole pixels, so an inline link's box can poke out of the
  // scrollport by a fraction (measured 0.125px) — nothing like the whole
  // links that scrolled under a sticky header before the frame was designed.
  const SUBPIXEL = 1;
  for (const s of stops) {
    expect(s.top, `"${s.text}" starts under the header`).toBeGreaterThanOrEqual(headerBottom - SUBPIXEL);
    expect(s.bottom, `"${s.text}" ends below the viewport`).toBeLessThanOrEqual(s.viewport + SUBPIXEL);
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

test("the sidebar insets its tree, so the current item's surface stops short of the edge @interaction", async ({ page }) => {
  await page.goto(story(SHELL), { waitUntil: "networkidle" });
  const r = await page.evaluate(() => {
    const sidebar = (document.getElementById("sidebar") as HTMLElement).getBoundingClientRect();
    const current = (document.querySelector('#sidebar a[aria-current="page"]') as HTMLElement).getBoundingClientRect();
    return { left: current.left - sidebar.left, right: sidebar.right - current.right };
  });
  expect(r.left).toBeGreaterThanOrEqual(8);
  expect(r.right).toBeGreaterThanOrEqual(8);
});

/** D110 — the frame's background and corner, proven in a browser: jsdom paints
 * nothing. The defaults must paint nothing either, since a consumer that sets
 * none of these keeps today's look. */
const FRAME = "components-appshell--frame";

const paint = (page: Page) =>
  page.evaluate(() => {
    const main = document.getElementById("main") as HTMLElement;
    const root = main.parentElement as HTMLElement;
    const css = (el: Element) => getComputedStyle(el);
    return {
      root: css(root).backgroundColor,
      main: css(main).backgroundColor,
      sidebar: css(document.getElementById("sidebar") as HTMLElement).backgroundColor,
      header: css(document.querySelector("header") as HTMLElement).backgroundColor,
      radius: css(main).borderStartStartRadius,
      // The page's own canvas, resolved the way a color property resolves it.
      canvas: (() => {
        const probe = document.createElement("div");
        probe.style.background = "var(--psi-bg-primary)";
        root.parentElement?.appendChild(probe);
        const value = css(probe).backgroundColor;
        probe.remove();
        return value;
      })(),
    };
  });

const heights = (page: Page) =>
  page.locator("header").evaluate((el) => {
    const row = el.firstElementChild as HTMLElement;
    return { bar: el.getBoundingClientRect().height, row: row.getBoundingClientRect().height };
  });

for (const id of [SHELL, "components-appshell--sidebar-closed"]) {
  test(`${id} paints no frame and no corner by default @interaction`, async ({ page }) => {
    await page.goto(story(id), { waitUntil: "networkidle" });
    const p = await paint(page);
    expect(p.root).toBe("rgba(0, 0, 0, 0)");
    expect(p.main).toBe("rgba(0, 0, 0, 0)");
    expect(p.radius).toBe("0px");
  });
}

test("the default bar is its height token plus a 1px line @interaction", async ({ page }) => {
  await page.goto(story(SHELL), { waitUntil: "networkidle" });
  const { bar, row } = await heights(page);
  expect(bar).toBe(row + 1);
});

for (const theme of ["light", "ember"]) {
  test(`the frame paints one colour behind the corner, and the surface beside it, in ${theme} @interaction`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${FRAME}&globals=theme:${theme}`, { waitUntil: "networkidle" });
    const p = await paint(page);
    // A wedge shows if the root's colour drifts from the sub-theme's canvas.
    expect(p.root).not.toBe("rgba(0, 0, 0, 0)");
    expect(p.sidebar).toBe(p.root);
    expect(p.header).toBe(p.root);
    expect(p.main).toBe(p.canvas);
    expect(p.main).not.toBe(p.root);
    expect(p.radius).toBe("12px");
  });
}

test("with its line at width 0, the frame's bar is exactly its height token @interaction", async ({ page }) => {
  await page.goto(story(FRAME), { waitUntil: "networkidle" });
  const { bar, row } = await heights(page);
  expect(bar).toBe(row);
});

// D111 — colour inherits as a resolved value, so without a colour of its own the
// bar's text keeps the page's, whatever theme the bar is under.
for (const theme of ["light", "ember"]) {
  test(`plain text in a themed bar takes the bar's foreground, not the page's, in ${theme} @interaction`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${FRAME}&globals=theme:${theme}`, { waitUntil: "networkidle" });
    const colours = await page.getByText("Signed in as Ada").evaluate((el) => {
      const probe = (parent: Element) => {
        const p = document.createElement("span");
        p.style.color = "var(--psi-fg-primary)";
        parent.appendChild(p);
        const value = getComputedStyle(p).color;
        p.remove();
        return value;
      };
      return {
        text: getComputedStyle(el).color,
        bar: probe(el.closest("header") as Element),
        page: getComputedStyle(document.body).color,
      };
    });
    expect(colours.bar).not.toBe(colours.page);
    expect(colours.text).toBe(colours.bar);
  });
}

test("--psi-navbar-fg on the bar sets its plain text @interaction", async ({ page }) => {
  await page.goto(story(FRAME), { waitUntil: "networkidle" });
  await page.locator("header").evaluate((el: HTMLElement) => el.style.setProperty("--psi-navbar-fg", "rgb(1, 2, 3)"));
  await expect(page.getByText("Signed in as Ada")).toHaveCSS("color", "rgb(1, 2, 3)");
});

test("the frame's corner squares when the sidebar closes, and comes back @interaction", async ({ page }) => {
  await page.goto(story(FRAME), { waitUntil: "networkidle" });
  const menu = page.getByRole("button", { name: "Menu" });
  await menu.click();
  expect((await paint(page)).radius).toBe("0px");
  await menu.click();
  expect((await paint(page)).radius).toBe("12px");
});

test("focused by the skip link, the frame's main draws the shared ring with its corner in place @interaction", async ({ page }) => {
  await page.goto(story(FRAME), { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const at = await focused(page);
  expect(at.tag).toBe("MAIN");
  const ring = await page.locator("main#main").evaluate((el) => {
    const cs = getComputedStyle(el);
    return { style: cs.outlineStyle, offset: parseFloat(cs.outlineOffset), radius: cs.borderStartStartRadius };
  });
  expect(ring.style).toBe("solid");
  expect(ring.offset).toBeLessThan(0);
  expect(ring.radius).toBe("12px");
});

/** D113 and D114 — main's padding, the banner slot and the sidebar's line,
 * measured in a browser: jsdom computes no padding, no margin and no border. */
const BANNER = "components-appshell--with-banner";
const LINE = "components-appshell--sidebar-line";

const mainBox = (page: Page) =>
  page.evaluate(() => {
    const main = document.getElementById("main") as HTMLElement;
    const cs = getComputedStyle(main);
    const m = main.getBoundingClientRect();
    const first = main.firstElementChild as HTMLElement;
    const f = first.getBoundingClientRect();
    const fcs = getComputedStyle(first);
    return {
      padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft],
      h1Inset: (main.querySelector("h1") as HTMLElement).getBoundingClientRect().left - m.left,
      h1FromMainTop: (main.querySelector("h1") as HTMLElement).getBoundingClientRect().top - m.top,
      h1FromBanner:
        first.tagName !== "H1" && first.firstElementChild
          ? (main.querySelector("h1") as HTMLElement).getBoundingClientRect().top -
            first.firstElementChild.getBoundingClientRect().bottom
          : null,
      first: {
        display: fcs.display,
        top: f.top - m.top,
        left: f.left - m.left,
        // clientLeft + clientWidth is main's padding box, which leaves out a scrollbar.
        right: m.left + main.clientLeft + main.clientWidth - f.right,
        marginBottom: fcs.marginBottom,
        paddingBottom: fcs.paddingBottom,
      },
    };
  });

test("main pads its page by 24px on every side by default @interaction", async ({ page }) => {
  await page.goto(story(SHELL), { waitUntil: "networkidle" });
  const b = await mainBox(page);
  expect(b.padding).toEqual(["24px", "24px", "24px", "24px"]);
  // The page is main's own child: its heading starts at the padding, not at twice it.
  expect(b.h1Inset).toBe(24);
});

test("a banner keeps main's three edges, and the page starts below it as it starts below the header @interaction", async ({ page }) => {
  await page.goto(story(BANNER), { waitUntil: "networkidle" });
  const b = await mainBox(page);
  expect(b.first.top).toBe(0);
  expect(b.first.left).toBe(0);
  expect(b.first.right).toBe(0);
  expect(b.first.marginBottom).toBe("0px");
  expect(b.first.paddingBottom).toBe("24px");
  // Without a banner the heading starts one block padding plus its own margin
  // below main's top. Under a banner it starts the same distance below the banner.
  await page.goto(story(SHELL), { waitUntil: "networkidle" });
  const plain = await mainBox(page);
  expect(b.h1FromBanner).not.toBeNull();
  expect(b.h1FromBanner as number).toBeCloseTo(plain.h1FromMainTop, 1);
  expect(plain.h1FromMainTop).toBeGreaterThan(24);
  expect(b.h1Inset).toBe(24);
});

test("with both padding tokens at 0, the banner and the page keep main's edges @interaction", async ({ page }) => {
  await page.goto(story(BANNER), { waitUntil: "networkidle" });
  await page.locator("#main").evaluate((main: HTMLElement) => {
    const root = main.parentElement as HTMLElement;
    root.style.setProperty("--psi-app-shell-main-padding-inline", "0");
    root.style.setProperty("--psi-app-shell-main-padding-block", "0");
  });
  const b = await mainBox(page);
  expect(b.padding).toEqual(["0px", "0px", "0px", "0px"]);
  expect(b.first.top).toBe(0);
  expect(b.first.left).toBe(0);
  expect(b.first.right).toBe(0);
  expect(b.first.marginBottom).toBe("0px");
  expect(b.first.paddingBottom).toBe("0px");
  expect(b.h1Inset).toBe(0);
});

test("a banner wrapper with nothing in it takes no space @interaction", async ({ page }) => {
  await page.goto(story(BANNER), { waitUntil: "networkidle" });
  await page.locator("#main").evaluate((main: HTMLElement) => (main.firstElementChild as HTMLElement).replaceChildren());
  const b = await mainBox(page);
  expect(b.first.display).toBe("none");
});

const sidebarEdges = (page: Page) =>
  page.locator("#sidebar").evaluate((el) => {
    const cs = getComputedStyle(el);
    const probe = document.createElement("span");
    probe.style.color = "var(--psi-border-faint)";
    el.appendChild(probe);
    const faint = getComputedStyle(probe).color;
    probe.remove();
    return {
      left: cs.borderLeftWidth,
      right: cs.borderRightWidth,
      rightStyle: cs.borderRightStyle,
      rightColor: cs.borderRightColor,
      leftColor: cs.borderLeftColor,
      faint,
    };
  });

test("the sidebar draws no line by default @interaction", async ({ page }) => {
  await page.goto(story(SHELL), { waitUntil: "networkidle" });
  const e = await sidebarEdges(page);
  expect(e.left).toBe("0px");
  expect(e.right).toBe("0px");
});

test("at width 1px the sidebar draws a faint line on its inline-end edge, which mirrors in right-to-left @interaction", async ({ page }) => {
  await page.goto(story(LINE), { waitUntil: "networkidle" });
  const ltr = await sidebarEdges(page);
  expect(ltr.right).toBe("1px");
  expect(ltr.rightStyle).toBe("solid");
  expect(ltr.rightColor).toBe(ltr.faint);
  expect(ltr.left).toBe("0px");

  await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
  const rtl = await sidebarEdges(page);
  expect(rtl.left).toBe("1px");
  expect(rtl.leftColor).toBe(rtl.faint);
  expect(rtl.right).toBe("0px");
});
