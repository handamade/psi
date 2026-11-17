import { test, expect } from "@playwright/test";

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
