import { test, expect, type Page } from "@playwright/test";

/** D109 — the two Panel-rooted presets lay out as columns. Before D109,
 * empty-state ran its headline, explanation and button together on one line,
 * and feedback-form stacked its Fields and button flush. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

const rows = (page: Page, selectors: string[]) =>
  Promise.all(selectors.map((s) => page.locator(s).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  })));

test("the empty-state preset is three rows 8px apart @interaction", async ({ page }) => {
  await page.goto(story("patterns-presets--empty-state"), { waitUntil: "networkidle" });
  const [headline, explanation, button] = await rows(page, ["#storybook-root h3", "#storybook-root p", "#storybook-root button"]);
  expect(explanation.top - headline.bottom).toBeCloseTo(8, 0);
  expect(button.top - explanation.bottom).toBeCloseTo(8, 0);
});

test("the feedback-form preset spaces its fields and button 24px apart @interaction", async ({ page }) => {
  await page.goto(story("patterns-presets--feedback-form"), { waitUntil: "networkidle" });
  const stack = page.locator("#storybook-root [class*='_stack_']").first();
  const tops = await stack.evaluate((el) =>
    [...el.children].map((c) => {
      const r = c.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    }),
  );
  expect(tops).toHaveLength(3);
  expect(tops[1]!.top - tops[0]!.bottom).toBeCloseTo(24, 0);
  expect(tops[2]!.top - tops[1]!.bottom).toBeCloseTo(24, 0);
  // The fields fill the column: a first version aligned the Stack to start,
  // which shrank the Description Field and its Textarea to their content.
  const stackWidth = await stack.evaluate((el) => el.getBoundingClientRect().width);
  const textarea = await page.locator("#storybook-root textarea").evaluate((el) => el.getBoundingClientRect().width);
  expect(textarea).toBeCloseTo(stackWidth, 0);
});
