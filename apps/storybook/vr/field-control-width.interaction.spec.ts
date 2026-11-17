import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D125 — a Field's control width and a FieldStack's cap. jsdom does no layout, so the widths, the clamp in a
 * narrow column and the cap are measured here, in Chromium. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

const widthOf = (page: Page, selector: string): Promise<number[]> =>
  page.locator(selector).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));

// The control of a Field: its direct child that is neither its label nor its message <p>.
const CONTROL = ":scope > :not(label):not(legend):not(p)";

test("each step sets the control's width, and the message keeps the Field's @interaction", async ({ page }) => {
  await page.goto(story("components-field--control-width"), { waitUntil: "networkidle" });
  const fields = page.locator("#storybook-root [data-control-width]");
  const count = await fields.count();
  expect(count).toBeGreaterThanOrEqual(10);
  for (let i = 0; i < count; i++) {
    const field = fields.nth(i);
    // The start Field in the 360px wrapper has its own test: its control column is narrower than the Field.
    if (await field.evaluate((el) => el.getAttribute("data-label-position") === "start" && el.parentElement!.getBoundingClientRect().width === 360)) continue;
    const step = Number(await field.getAttribute("data-control-width"));
    const fieldWidth = (await field.boundingBox())!.width;
    const control = (await field.locator(CONTROL).first().boundingBox())!;
    // A control is its step, or the Field's width when the column is narrower (the 360px case).
    expect(control.width, `field ${i}`).toBeCloseTo(Math.min(step, fieldWidth), 0);
  }
  // The postcode's error spans the Field (560), not its 120px control.
  const postcode = page.locator("#storybook-root [data-control-width='120']");
  const message = (await postcode.locator("p").boundingBox())!;
  expect(message.width).toBeGreaterThan(120);
});

test("a 480 step in a 360px column shrinks to the column @interaction", async ({ page }) => {
  await page.goto(story("components-field--control-width"), { waitUntil: "networkidle" });
  const field = page.locator("#storybook-root [data-control-width='480']:not([data-label-position])").last();
  const control = (await field.locator("input").boundingBox())!;
  expect(control.width).toBeCloseTo(360, 0);
});

test("a start 480 field in a 360px column keeps its control inside the column @interaction", async ({ page }) => {
  await page.goto(story("components-field--control-width"), { waitUntil: "networkidle" });
  const field = page.locator("#storybook-root [data-control-width='480'][data-label-position=start]").last();
  const box = (await field.boundingBox())!;
  const label = (await field.locator("label").boundingBox())!;
  const control = (await field.locator("input").boundingBox())!;
  expect(control.x + control.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
  expect(control.x).toBeGreaterThan(label.x + label.width);
  expect(control.width).toBeLessThan(480);
});

test("a start Field puts its sized control after its label @interaction", async ({ page }) => {
  await page.goto(story("components-field--control-width"), { waitUntil: "networkidle" });
  const field = page.locator("#storybook-root [data-label-position=start][data-control-width='240']").first();
  const label = (await field.locator("label").boundingBox())!;
  const control = (await field.locator("input").boundingBox())!;
  expect(control.width).toBeCloseTo(240, 0);
  expect(control.x).toBeGreaterThan(label.x + label.width);
});

test("a FieldStack in a wide column stops at 640px, and its controls take their steps @interaction", async ({ page }) => {
  await page.goto(story("components-fieldstack--capped"), { waitUntil: "networkidle" });
  const stack = (await page.locator("#storybook-root [data-label-position]").first().boundingBox())!;
  expect(stack.width).toBeCloseTo(640, 0);
  const widths = await widthOf(page, "#storybook-root [data-control-width] > :is(input, select)");
  expect(widths.map(Math.round)).toEqual([320, 240, 80]);
  // Notes has no controlWidth: its textarea fills the control column, which ends at the stack's edge.
  const textarea = (await page.locator("#storybook-root textarea").boundingBox())!;
  expect(textarea.x + textarea.width).toBeCloseTo(stack.x + stack.width, 0);
});
