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
  expect(m.cornerRadius).toBe(m.tableRadius - 1);
  expect(m.lastCornerRadius).toBe(m.tableRadius - 1);
  expect(m.lastBottom).toBe("0px");
});

test("inside a TableContainer the header sticks, the content scrolls sideways, and the frame is the container's @interaction", async ({ page }) => {
  await page.goto(story("in-container"), { waitUntil: "networkidle" });
  const m = await page.evaluate(() => {
    const c = document.querySelector<HTMLElement>('[role="region"]')!;
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
