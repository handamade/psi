import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D96 — a NavTree link with `aria-current="true"` is marked as the entry the
 * current screen sits under: medium weight and the current colour, with no
 * surface and no inline-start bar, which stay the marks of `page`.
 *
 * jsdom does no layout or cascade, so the unit tests read the rules; this
 * reads what the browser computes. Before D96 the link computed exactly like
 * its plain siblings. No screenshots. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

test("a link marked aria-current=true reads as the parent of the current screen @interaction", async ({ page }) => {
  await page.goto(story("components-navtree--parent-current"), { waitUntil: "networkidle" });
  const computed = (name: string) =>
    page.getByRole("link", { name }).evaluate((el) => {
      const cs = getComputedStyle(el);
      const before = getComputedStyle(el, "::before");
      return { weight: cs.fontWeight, color: cs.color, background: cs.backgroundColor, before: before.content };
    });
  const parent = await computed("Customers");
  const plain = await computed("Overview");
  expect(plain.weight).toBe("400");
  expect(parent.weight).toBe("500");
  expect(parent.color).not.toBe(plain.color);
  expect(parent.background).toBe("rgba(0, 0, 0, 0)");
  expect(parent.before).toBe("none");
});

/** D124 — the browser joins the count to the link's name with a space, sizes
 * the icon by the token (16) and pushes the count to the inline end. */
test("an entry's icon is 16px and its count joins the name at the row's end @interaction", async ({ page }) => {
  await page.goto(story("components-navtree--with-counts"), { waitUntil: "networkidle" });
  const link = page.getByRole("link", { name: "Cards 238" });
  await expect(link).toBeVisible();
  const box = await link.evaluate((el) => {
    const svg = el.querySelector("svg")!.getBoundingClientRect();
    const count = el.lastElementChild!.getBoundingClientRect();
    const a = el.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(el).paddingInlineEnd);
    return { w: svg.width, h: svg.height, countEnd: count.right, linkEnd: a.right - pad };
  });
  expect(box.w).toBe(16);
  expect(box.h).toBe(16);
  expect(Math.abs(box.countEnd - box.linkEnd)).toBeLessThan(1);
  await expect(page.getByRole("link", { name: "Stuck 4 stuck" })).toBeVisible();
});

/** D138 — the guide line and the bar on it, measured. The group's button pads
 * 12px and its icon is 16px, so the icon centres on 20px of the group's `<li>`.
 * The line is 1px, centred there and rounded down to a whole pixel: 19px. The
 * entries' links start at 24px, and the bar lands on the line. */
type Measure = {
  lineStart: number;
  lineWidth: number;
  lineTop: number;
  lineBottom: number;
  lineColor: string;
  barStart: number;
  barWidth: number;
  barColor: string;
};

async function measureGuide(page: Page, group: string, current: string): Promise<Measure> {
  const li = page.getByRole("button", { name: group }).locator("xpath=ancestor::li[1]");
  return li.evaluate((el, current) => {
    const rtl = getComputedStyle(el).direction === "rtl";
    const ul = el.querySelector("ul")!;
    const line = getComputedStyle(ul, "::before");
    const a = [...el.querySelectorAll("a")].find((x) => x.textContent?.trim() === current)!;
    const bar = getComputedStyle(a, "::before");
    const liBox = el.getBoundingClientRect();
    const ulBox = ul.getBoundingClientRect();
    const aBox = a.getBoundingClientRect();
    // Each start is measured from the <li>'s inline-start edge: its left in
    // LTR, its right in RTL.
    const lineStart = rtl ? liBox.right - ulBox.right + parseFloat(line.right) : ulBox.left - liBox.left + parseFloat(line.left);
    const barStart = rtl ? liBox.right - aBox.right + parseFloat(bar.right) : aBox.left - liBox.left + parseFloat(bar.left);
    return {
      lineStart,
      lineWidth: parseFloat(rtl ? line.borderRightWidth : line.borderLeftWidth),
      lineTop: parseFloat(line.top),
      lineBottom: parseFloat(line.bottom),
      lineColor: rtl ? line.borderRightColor : line.borderLeftColor,
      barStart,
      barWidth: parseFloat(bar.width),
      barColor: bar.backgroundColor,
    };
  }, current);
}

test("a guide line runs under the group's icon, and the current bar is a segment of it @interaction", async ({ page }) => {
  await page.goto(story("components-navtree--guide-line"), { waitUntil: "networkidle" });
  const m = await measureGuide(page, "Cards", "Suspended");
  expect(m.lineWidth).toBe(1);
  expect(m.lineStart).toBe(19);
  expect(m.lineTop).toBe(2);
  expect(m.lineBottom).toBe(2);
  expect(m.barWidth).toBe(1);
  expect(m.barStart).toBe(m.lineStart);
  expect(m.barColor).not.toBe(m.lineColor);
});

test("the guide line and the bar mirror in RTL @interaction", async ({ page }) => {
  await page.goto(story("components-navtree--guide-line"), { waitUntil: "networkidle" });
  await page.locator("[data-psi-theme='dark']").evaluate((el) => el.setAttribute("dir", "rtl"));
  const m = await measureGuide(page, "Cards", "Suspended");
  expect(m.lineWidth).toBe(1);
  expect(m.lineStart).toBe(19);
  expect(m.barStart).toBe(19);
});

test("icons take their own colours, and the current entry's icon follows its text @interaction", async ({ page }) => {
  await page.goto(story("components-navtree--guide-line"), { waitUntil: "networkidle" });
  const group = await page.getByRole("button", { name: "Cards" }).evaluate((b) => ({
    icon: getComputedStyle(b.querySelector("span[aria-hidden]")!).color,
    label: getComputedStyle(b).color,
  }));
  expect(group.icon).not.toBe(group.label);
  const entry = (name: string) =>
    page.getByRole("link", { name }).evaluate((a) => ({
      icon: getComputedStyle(a.querySelector("span[aria-hidden]")!).color,
      text: getComputedStyle(a).color,
    }));
  const search = await entry("Search");
  expect(search.icon).not.toBe(search.text);
  // Mark a top-level entry current: its text turns accent, and its icon with it.
  await page.getByRole("link", { name: "Account" }).evaluate((a) => a.setAttribute("aria-current", "page"));
  const account = await entry("Account");
  expect(account.icon).toBe(account.text);
  expect(account.text).not.toBe(search.text);
});

test("with the default tokens nothing moves: no line, a 3px bar at the link's edge, icons in their text's colour @interaction", async ({ page }) => {
  await page.goto(story("components-navtree--with-icons"), { waitUntil: "networkidle" });
  const m = await measureGuide(page, "Cards", "Active");
  expect(m.lineWidth).toBe(0);
  expect(m.barWidth).toBe(3);
  expect(m.barStart).toBe(24);
  const icons = await page.getByRole("navigation", { name: "Main" }).evaluate((nav) =>
    [...nav.querySelectorAll("span[aria-hidden]")]
      .filter((s) => s.querySelector("svg") && !s.closest("[class*='countSlot']"))
      .map((s) => getComputedStyle(s).color === getComputedStyle(s.parentElement!).color),
  );
  expect(icons.length).toBeGreaterThan(0);
  expect(icons.every(Boolean)).toBe(true);
});
