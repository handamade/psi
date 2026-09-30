import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D86 — Skeleton's pulse stops under reduced motion.
 *
 * D30 zeroes every duration token under prefers-reduced-motion, which turns a
 * finite animation into a jump to its end state. An infinite, alternating
 * animation is different: with a 0.01ms period it samples a different phase
 * on every frame and flickers instead of stopping. So skeleton.module.css
 * also sets `animation: none` under the media query. This pins both halves —
 * the token zeroed, and the animation gone — which jsdom cannot show, since
 * it applies neither the media query nor the keyframes. No screenshots. */

const STORY = "/iframe.html?id=feedback-skeleton--three-lines&globals=theme:light";
const skeleton = "[data-psi-skeleton]";

const animation = (page: Page) =>
  page.locator(skeleton).first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return { name: cs.animationName, duration: cs.animationDuration, opacity: cs.opacity };
  });

test("pulses on opacity with the duration token, with motion allowed @interaction", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(STORY, { waitUntil: "networkidle" });
  const a = await animation(page);
  expect(a.name).toMatch(/skeleton-pulse/); // CSS Modules scopes the keyframes name
  expect(a.duration).toBe("0.6s");
  await expect(page.locator(skeleton).first()).toHaveAttribute("aria-hidden", "true");
});

test("stops entirely under reduced motion — no flicker from a zeroed period @interaction", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(STORY, { waitUntil: "networkidle" });
  const a = await animation(page);
  expect(a.name).toBe("none");
  // Fully opaque and steady: sample twice across frames.
  expect(a.opacity).toBe("1");
  await page.waitForTimeout(120);
  expect((await animation(page)).opacity).toBe("1");
  // And the duration token itself is zeroed by D30, so anything else driven
  // by it complies too.
  const token = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--psi-duration-600").trim(),
  );
  expect(parseFloat(token)).toBeCloseTo(0.01, 3);
});
