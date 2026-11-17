import { test, expect } from "@playwright/test";

/** D126 — what jsdom cannot show: a sticky header stays at the top of the
 * element that scrolls, the container scrolls sideways, and the frame's
 * corners are drawn. Geometry, not screenshots. */

const story = (id: string) => `/iframe.html?id=data-table--${id}&globals=theme:light`;

test("a bare sticky header stays at the top of its scrolling region @interaction", async ({ page }) => {
  await page.goto(story("sticky"), { waitUntil: "networkidle" });
  const m = await page.evaluate(() => {
    const region = document.querySelector<HTMLElement>('[data-testid="sticky-region"]')!;
    const th = region.querySelector("th")!;
    return { scrollTop: region.scrollTop, delta: th.getBoundingClientRect().top - region.getBoundingClientRect().top };
  });
  expect(m.scrollTop).toBe(200);
  expect(m.delta).toBe(0);
});

test("a bare table rounds its corner cells and drops the last row's bottom border @interaction", async ({ page }) => {
  await page.goto(story("size-40"), { waitUntil: "networkidle" });
  const m = await page.evaluate(() => {
    // Scoped to the story root: Storybook's own chrome can contain tables.
    const table = document.querySelector("#storybook-root table")!;
    const firstTh = table.querySelector("thead tr:first-child > :first-child")!;
    const lastRow = table.querySelector("tbody tr:last-child > td:last-child")!;
    return {
      collapse: getComputedStyle(table).borderCollapse,
      tableRadius: parseFloat(getComputedStyle(table).borderTopLeftRadius),
      cornerRadius: parseFloat(getComputedStyle(firstTh).borderTopLeftRadius),
      lastBottom: getComputedStyle(lastRow).borderBottomWidth,
      lastCornerRadius: parseFloat(getComputedStyle(lastRow).borderBottomRightRadius),
    };
  });
  expect(m.collapse).toBe("separate");
  expect(m.cornerRadius).toBeGreaterThan(0);
  expect(m.cornerRadius).toBe(m.tableRadius - 1);
  expect(m.lastCornerRadius).toBe(m.tableRadius - 1);
  expect(m.lastBottom).toBe("0px");
});

test("inside a TableContainer the header sticks, the content scrolls sideways, and the frame is the container's @interaction", async ({ page }) => {
  await page.goto(story("in-container"), { waitUntil: "networkidle" });
  const m = await page.evaluate(() => {
    const c = document.querySelector<HTMLElement>('#storybook-root [role="region"]')!;
    const table = c.querySelector("table")!;
    const th = c.querySelector("th")!;
    return {
      scrollTop: c.scrollTop,
      scrollLeft: c.scrollLeft,
      overflowsInline: c.scrollWidth > c.clientWidth,
      headerDelta: th.getBoundingClientRect().top - (c.getBoundingClientRect().top + c.clientTop),
      containerRadius: parseFloat(getComputedStyle(c).borderTopLeftRadius),
      tableBorder: getComputedStyle(table).borderTopWidth,
      name: c.getAttribute("aria-labelledby") === c.querySelector("caption")!.id,
    };
  });
  expect(m.scrollTop).toBe(200);
  expect(m.scrollLeft).toBe(120);
  expect(m.overflowsInline).toBe(true);
  expect(m.headerDelta).toBe(0);
  expect(m.containerRadius).toBeGreaterThan(0);
  expect(m.tableBorder).toBe("0px");
  expect(m.name).toBe(true);
});

/** D128 — WCAG 2.4.11. A row that sits wholly under the sticky header is
 * inside the scrollport, so without scroll padding the browser treats it as
 * visible and Shift+Tab onto it does not scroll: it stays fully obscured. The
 * container keeps the header's measured size clear, so it scrolls down to the
 * header's bottom edge. Rows are made focusable in the page: the story has no
 * focusable content of its own. */
test("Shift+Tab onto a row under a sticky header scrolls it clear of the header @interaction", async ({ page }) => {
  await page.goto(story("in-container"), { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const c = document.querySelector<HTMLElement>('#storybook-root [role="region"]')!;
    const th = c.querySelector("th")!;
    const cells = [...c.querySelectorAll<HTMLElement>("tbody tr > :first-child")];
    cells.forEach((td) => (td.tabIndex = 0));
    // Put row 5 exactly under the header (its top at the header's top), then
    // focus row 6, just below the header.
    c.scrollTop += cells[5].getBoundingClientRect().top - th.getBoundingClientRect().top;
    cells[6].focus({ preventScroll: true });
  });
  await page.keyboard.press("Shift+Tab");
  const m = await page.evaluate(() => {
    const c = document.querySelector<HTMLElement>('#storybook-root [role="region"]')!;
    const focused = document.activeElement as HTMLElement;
    const cells = [...c.querySelectorAll("tbody tr > :first-child")];
    return {
      index: cells.indexOf(focused),
      padding: getComputedStyle(c).scrollPaddingTop,
      headerHeight: c.querySelector("thead")!.getBoundingClientRect().height,
      gap: focused.getBoundingClientRect().top - c.querySelector("th")!.getBoundingClientRect().bottom,
    };
  });
  expect(m.index).toBe(5);
  expect(m.padding).toBe(`${m.headerHeight}px`);
  expect(m.gap).toBeGreaterThanOrEqual(0);
});

/** D128 — with bodies [rows, rows, empty], the edge is the second body's. And
 * with no head and an empty first body, the top corners are the next one's. */
test("the frame's edges belong to the first and last body that have rows @interaction", async ({ page }) => {
  await page.goto(story("size-40"), { waitUntil: "networkidle" });
  const m = await page.evaluate(() => {
    const table = document.querySelector("#storybook-root table")!;
    const body = table.querySelector("tbody")!;
    const second = body.cloneNode(true) as HTMLElement;
    table.appendChild(second);
    const empty = document.createElement("tbody");
    empty.className = body.className;
    table.appendChild(empty);
    const radius = parseFloat(getComputedStyle(table).borderTopLeftRadius) - 1;
    const last = second.querySelector("tr:last-child > :last-child")!;
    const earlier = body.querySelector("tr:last-child > :last-child")!;
    const bottom = {
      lastBorder: getComputedStyle(last).borderBottomWidth,
      lastRadius: parseFloat(getComputedStyle(last).borderBottomRightRadius),
      earlierBorder: getComputedStyle(earlier).borderBottomWidth,
    };
    table.querySelector("thead")!.remove();
    table.insertBefore(empty.cloneNode(), body);
    const first = body.querySelector("tr:first-child > :first-child")!;
    return { radius, ...bottom, topRadius: parseFloat(getComputedStyle(first).borderTopLeftRadius) };
  });
  expect(m.lastBorder).toBe("0px");
  expect(m.lastRadius).toBe(m.radius);
  expect(m.earlierBorder).toBe("1px");
  expect(m.topRadius).toBe(m.radius);
});
