import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** D82 — one focus ring, proven in a browser.
 *
 * Loads every story, presses Tab through it, and reads the computed outline of
 * each tab stop. A stop must draw `solid`, at --psi-focus-ring-width, at
 * --psi-focus-ring-offset or --psi-focus-ring-offset-inset. The token values
 * are read from the page, so this follows them if they change.
 *
 * No screenshots, so unlike stories.spec.ts it runs on macOS as well as CI
 * (`pnpm test:e2e`).
 *
 * A test over CSS text can show that a rule exists. It cannot show that the
 * ring is drawn: a missing rule on Menu items and on a long drawer's panel
 * both shipped as the browser's own ring, and the brief for D82 listed a gap
 * on Toast that a browser does not have. */

interface IndexEntry { id: string; type: string; }
const index = JSON.parse(
  readFileSync(join(import.meta.dirname, "../storybook-static/index.json"), "utf8"),
) as { entries: Record<string, IndexEntry> };
const stories = Object.values(index.entries).filter((e) => e.type === "story");

/** Tab stops Psi does not style. Each entry needs a reason. */
const NOT_PSI: { story: RegExp; selector: string; reason: string }[] = [
  {
    story: /^components-tooltip--/,
    selector: "button:not([class])",
    reason: "Tooltip clones handlers onto the consumer's own trigger; the stories use a raw <button> to stand for it.",
  },
];

/** A story with more tab stops than this is walked only this far. The longest
 * today is well under it; the cap only stops a focus loop from hanging CI. */
const MAX_STOPS = 40;

test.describe.configure({ mode: "parallel" });

for (const s of stories) {
  test(`${s.id} draws the shared ring on every tab stop @interaction`, async ({ page }) => {
    // Input and Select transition their outline; reduced motion zeroes the
    // duration tokens (D30), so the computed value is the settled one.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/iframe.html?id=${s.id}&globals=theme:light`, { waitUntil: "networkidle" });

    const ring = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const read = (name: string) => cs.getPropertyValue(name).trim();
      return {
        width: read("--psi-focus-ring-width"),
        offsets: [read("--psi-focus-ring-offset"), read("--psi-focus-ring-offset-inset")],
      };
    });
    expect(ring.width, "--psi-focus-ring-width is not defined on the page").not.toBe("");

    const skip = NOT_PSI.filter((a) => a.story.test(s.id)).map((a) => a.selector);

    const probe = () =>
      page.evaluate(async (skipSelectors) => {
        // Two frames: the first starts the (zero-length) outline transition,
        // the second reads its end value rather than its start.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const w = window as unknown as { __psiSeen?: WeakSet<Element> };
        const seen = (w.__psiSeen ??= new WeakSet());
        const again = seen.has(el);
        seen.add(el);
        // Checkbox and Switch keep the native input focusable and draw the
        // ring on the indicator that follows it.
        const own = getComputedStyle(el);
        const next = el.nextElementSibling ? getComputedStyle(el.nextElementSibling) : null;
        const cs = own.outlineStyle !== "solid" && next?.outlineStyle === "solid" ? next : own;
        const cls = typeof el.className === "string" ? el.className.split(" ")[0] : "";
        const role = el.getAttribute("role");
        return {
          again,
          skipped: skipSelectors.some((sel) => el.matches(sel)),
          name: `${el.tagName.toLowerCase()}${role ? `[role=${role}]` : ""}${cls ? `.${cls}` : ""}`,
          style: cs.outlineStyle,
          width: cs.outlineWidth,
          offset: cs.outlineOffset,
        };
      }, skip);

    const bad: string[] = [];
    // Dialog and Menu stories open focused: read that stop before any Tab.
    let stop = await probe();
    // Focus passes through the browser's own chrome between the last stop and
    // the first, and a modal <dialog> can be a stop on the far side of it. So
    // one empty read is a gap, and two in a row are the end.
    let empty = 0;
    for (let i = 0; i < MAX_STOPS && empty < 2; i++) {
      if (stop?.again) break;
      if (stop && !stop.skipped) {
        const ok = stop.style === "solid" && stop.width === ring.width && ring.offsets.includes(stop.offset);
        if (!ok) bad.push(`${stop.name}: ${stop.style} ${stop.width} at ${stop.offset}`);
      }
      await page.keyboard.press("Tab");
      stop = await probe();
      empty = stop ? 0 : empty + 1;
    }

    expect(bad, `tab stops not drawing ${ring.width} solid at ${ring.offsets.join(" or ")}`).toEqual([]);
  });
}
