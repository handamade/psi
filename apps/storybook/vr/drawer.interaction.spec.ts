import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Geometry coverage for D66 — a drawer is a Dialog placement, not a component.
 *
 * These tests take NO screenshots, so like menu.interaction.spec.ts they are
 * platform-independent and pass on macOS as well as CI. Every test carries the
 * @interaction tag so `pnpm test:e2e` can select them alone.
 *
 * jsdom has no layout engine, so the unit suite can assert the placement class
 * and the data attribute but never that the panel is actually flush to the
 * viewport edge and full height. That claim is the whole of D66, so it is
 * pinned here. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

async function measure(page: Page) {
  return page.evaluate(() => {
    const d = document.querySelector("dialog") as HTMLDialogElement;
    const b = d.getBoundingClientRect();
    return {
      x: Math.round(b.x),
      w: Math.round(b.width),
      h: Math.round(b.height),
      vw: window.innerWidth,
      vh: window.innerHeight,
      isModal: d.matches(":modal"),
      placement: d.getAttribute("data-placement"),
    };
  });
}

test("an inline-end drawer is flush to the inline edge and full height @interaction", async ({
  page,
}) => {
  await page.goto(story("components-dialog--drawer-inline-end"), { waitUntil: "networkidle" });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(300); // outlast the slide

  const g = await measure(page);
  expect(g.placement).toBe("inline-end");
  expect(g.isModal).toBe(true);
  // The two assertions that only a real layout engine can make. Note the
  // placements are box-sizing: border-box — without that the 1px borders fall
  // outside height: 100dvh and this reads 2px over the viewport.
  expect(g.x + g.w).toBe(g.vw);
  expect(g.h).toBe(g.vh);
});

test("an inline-start drawer is flush to the opposite edge @interaction", async ({ page }) => {
  await page.goto(story("components-dialog--drawer-inline-start"), { waitUntil: "networkidle" });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(300);

  const g = await measure(page);
  expect(g.placement).toBe("inline-start");
  expect(g.x).toBe(0);
  expect(g.h).toBe(g.vh);
});

test("a centered dialog is still centered and not full height @interaction", async ({ page }) => {
  // The regression guard for the placement CSS: the edge rules override
  // .dialog's max-width gutter and set box-sizing, and neither may leak into
  // the default placement — 204 committed baselines depend on center being
  // byte-identical.
  await page.goto(story("components-dialog--default"), { waitUntil: "networkidle" });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(300);

  const g = await measure(page);
  expect(g.placement).toBe("center");
  expect(g.h).toBeLessThan(g.vh);
  // Centered leaves comparable space on both sides.
  expect(Math.abs(g.x - (g.vw - g.x - g.w))).toBeLessThanOrEqual(1);
});

test("a drawer's panel scrolls internally so the footer stays reachable @interaction", async ({
  page,
}) => {
  await page.goto(story("components-dialog--drawer-long-content"), { waitUntil: "networkidle" });
  await expect(page.getByRole("dialog")).toBeVisible();

  const scrollable = await page.evaluate(() => {
    const panel = document.querySelector("dialog > div") as HTMLElement;
    return {
      overflows: panel.scrollHeight > panel.clientHeight,
      canScroll: getComputedStyle(panel).overflowY === "auto",
    };
  });
  expect(scrollable.overflows).toBe(true);
  expect(scrollable.canScroll).toBe(true);

  // Reachable is the actual contract — the footer button can be clicked.
  await expect(page.getByRole("button", { name: "Close", exact: true })).toBeVisible();
});
