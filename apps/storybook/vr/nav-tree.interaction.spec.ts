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
