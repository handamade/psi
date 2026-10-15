import { test, expect } from "@playwright/test";

/** D105 — WCAG 1.4.13 asks that content shown on hover be hoverable: the
 * pointer can move onto it without it disappearing. Before D105 the trigger
 * owned mouseleave and the bubble set `pointer-events: none`, so moving onto
 * the bubble closed it.
 *
 * jsdom has no geometry, so it cannot see the gap between trigger and bubble;
 * this walks a real pointer across it, in steps, for every placement. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

for (const placement of ["top", "bottom", "left", "right"]) {
  test(`a ${placement} tooltip stays open with the pointer on it @interaction`, async ({ page }) => {
    await page.goto(story(`components-tooltip--${placement}`), { waitUntil: "networkidle" });
    const trigger = await page.getByRole("button", { name: "Hover me" }).boundingBox();
    if (!trigger) throw new Error("no trigger");
    await page.mouse.move(trigger.x + trigger.width / 2, trigger.y + trigger.height / 2);

    const bubble = page.getByRole("tooltip");
    await expect(bubble).toBeVisible();
    const box = await bubble.boundingBox();
    if (!box) throw new Error("no bubble");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await page.waitForTimeout(300);
    await expect(bubble).toBeVisible();

    await page.mouse.move(5, 5, { steps: 4 });
    await expect(bubble).toBeHidden();
  });
}
