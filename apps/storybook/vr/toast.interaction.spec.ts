import { test, expect } from "@playwright/test";

/** Interaction coverage for the two Toast claims jsdom cannot make (D64).
 *
 * These tests commit NO baselines — the one screenshot pair below is compared
 * against itself within a single run, so like menu.interaction.spec.ts they are
 * platform-independent and pass on macOS as well as CI. Every test carries the
 * @interaction tag so `pnpm test:e2e` can select them alone.
 *
 * jsdom ships the popover UA stylesheet but not the JS API, so the
 * vitest.setup.ts polyfill records showPopover() as a `data-open` attribute and
 * never clears `display: none`. Painting against the native top layer and real
 * pointer-events routing are therefore invisible to the unit suite — which is
 * exactly what this file pins. */

const STORY = "/iframe.html?id=feedback-toast--raised-from-dialog&globals=theme:light";

const region = "[data-psi-toast-region]";
const toast = "[data-psi-toast]";

test("a toast raised from inside a modal Dialog paints above the backdrop @interaction", async ({
  page,
}) => {
  await page.goto(STORY, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Fixed clip over the bottom-end corner where the toast will land — the same
  // region in both shots, so any byte difference is the toast itself.
  const clip = { x: 660, y: 710, width: 330, height: 75 };
  const before = await page.screenshot({ clip });

  await page.getByRole("button", { name: "Void" }).click();
  await expect(page.locator(toast)).toBeVisible();
  const after = await page.screenshot({ clip });

  // This is the claim popover="manual" exists to satisfy. A region positioned
  // with `position: fixed` at --psi-z-overlay would paint *under* the modal
  // dialog's backdrop — the top layer beats any z-index — and these two shots
  // would be identical.
  expect(Buffer.compare(before, after)).not.toBe(0);
});

test("a toast under an open modal is painted but inert @interaction", async ({ page }) => {
  await page.goto(STORY, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Open dialog" }).click();
  await page.getByRole("button", { name: "Void" }).click();
  await expect(page.locator(toast)).toBeVisible();

  // The documented limitation, pinned so nobody "fixes" it by shuffling the top
  // layer. showModal() makes everything outside the dialog subtree inert, so
  // the toast cannot be hit-tested while the dialog is open — hit testing over
  // its box is attributed to the dialog's backdrop instead. This is a property
  // of inertness, not of paint order: re-showing the popover does not change
  // it, which is why ToastRegion does not try.
  const box = (await page.locator(toast).boundingBox())!;
  const hitsToast = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-psi-toast]") !== null,
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
  expect(hitsToast).toBe(false);
});

test("the region's empty band stays click-through @interaction", async ({ page }) => {
  await page.goto(STORY, { waitUntil: "networkidle" });

  // The region is a flex band pinned to a corner. Without pointer-events: none
  // on it, an invisible strip of the page would be dead to the mouse — silent,
  // and easy to ship. Probe a point inside the region's box but outside any
  // toast, and assert the hit test falls through.
  const box = (await page.locator(region).boundingBox())!;
  const fellThrough = await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el !== null && el.closest("[data-psi-toast-region]") === null;
    },
    { x: box.x + box.width / 2, y: box.y + 4 },
  );
  expect(fellThrough).toBe(true);
});
