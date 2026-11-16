import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D115 — labels beside their controls. jsdom does no layout, so the shared
 * column, the cap, the stacking and the alignment are measured here, in
 * Chromium. WebKit and Firefox were measured once by the plan's spike. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

interface Box { left: number; right: number; top: number; bottom: number; width: number; cy: number; }
const boxes = (page: Page, selector: string): Promise<Box[]> =>
  page.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, cy: (r.top + r.bottom) / 2 };
    }),
  );

// Labels of every start Field in a stack: the Field's own <label> or <legend>, or the group label <div> of the
// div-group variant. All carry an id ending "-label"; that excludes the label-less Field's Checkbox, whose own
// <label> is its control and rightly sits in column 2.
const LABELS = "#storybook-root [data-in-stack][data-label-position=start] > :is(label, legend, div)[id$='-label']";

test("a single start field puts its label on its control's line at every size @interaction", async ({ page }) => {
  await page.goto(story("components-field--label-start"), { waitUntil: "networkidle" });
  const labels = await boxes(page, "#storybook-root [data-label-position=start] > label");
  const controls = await boxes(page, "#storybook-root [data-label-position=start] > :is(input, select)");
  expect(labels).toHaveLength(8);
  labels.forEach((label, i) => {
    expect(Math.abs(label.cy - controls[i].cy), `field ${i}`).toBeLessThanOrEqual(4);
    expect(label.right).toBeLessThan(controls[i].left);
  });
});

test("a start FieldStack lines its labels up in one column, and its controls in another @interaction", async ({ page }) => {
  await page.goto(story("components-fieldstack--side-labels"), { waitUntil: "networkidle" });
  const labels = await boxes(page, LABELS);
  const controls = await boxes(page, "#storybook-root [data-in-stack][data-label-position=start] > :is(input, select)");
  expect(labels.length).toBeGreaterThanOrEqual(3);
  for (const l of labels) expect(l.left).toBeCloseTo(labels[0].left, 0);
  for (const c of controls) expect(c.left).toBeCloseTo(controls[0].left, 0);
  expect(controls[0].left).toBeGreaterThan(Math.max(...labels.map((l) => l.right)));
  // The Notes field takes "top": its label sits above its textarea, at the stack's start edge.
  const notesLabel = (await boxes(page, "#storybook-root [data-in-stack]:not([data-label-position]) > label"))[0];
  const textarea = (await boxes(page, "#storybook-root textarea"))[0];
  expect(notesLabel.bottom).toBeLessThanOrEqual(textarea.top);
  expect(textarea.left).toBeCloseTo(labels[0].left, 0);
});

test("the label column stops at 240px and a longer label wraps @interaction", async ({ page }) => {
  await page.goto(story("components-fieldstack--long-label"), { waitUntil: "networkidle" });
  const labels = await boxes(page, LABELS);
  const widest = Math.max(...labels.map((l) => l.width));
  expect(widest).toBeLessThanOrEqual(240);
  expect(labels.some((l) => l.bottom - l.top > 20)).toBe(true);
});

test("under 480px every label returns above its control @interaction", async ({ page }) => {
  await page.goto(story("components-fieldstack--narrow"), { waitUntil: "networkidle" });
  const fields = page.locator("#storybook-root [data-in-stack][data-label-position=start]");
  const count = await fields.count();
  for (let i = 0; i < count; i++) {
    const parts = await fields.nth(i).evaluate((f) =>
      [...f.children].map((c) => { const r = c.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }),
    );
    for (let p = 1; p < parts.length; p++) expect(parts[p].top).toBeGreaterThanOrEqual(parts[p - 1].bottom);
  }
});

test("right-to-left puts the label column on the right @interaction", async ({ page }) => {
  await page.goto(story("components-fieldstack--right-to-left"), { waitUntil: "networkidle" });
  const labels = await boxes(page, LABELS);
  const controls = await boxes(page, "#storybook-root [data-in-stack][data-label-position=start] > :is(input, select)");
  for (const l of labels) expect(l.right).toBeCloseTo(labels[0].right, 0);
  expect(controls[0].right).toBeLessThan(Math.min(...labels.map((l) => l.left)));
});
