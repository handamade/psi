import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** D107 — the preview models a consumer's app root, which sets the body font
 * as well as the background. Before D107 it set only background and colour,
 * so text a story placed in a Panel, Dialog, Card or tab panel rendered in the
 * browser's default serif, and native buttons in system Arial: 44 of 197
 * stories. A real consumer's page never looks like that, so the stories and
 * their baselines misled.
 *
 * Every visible text node in every story must render in one of Psi's own
 * stacks (sans, mono, serif, display) as the active theme resolves them. */

interface IndexEntry { id: string; type: string; }
const index = JSON.parse(
  readFileSync(join(import.meta.dirname, "../storybook-static/index.json"), "utf8"),
) as { entries: Record<string, IndexEntry> };
const stories = Object.values(index.entries).filter((e) => e.type === "story");

for (const s of stories) {
  test(`${s.id} sets every text in a Psi font stack @interaction`, async ({ page }) => {
    // Wait for Storybook's own `finished` phase (render and play function done):
    // far cheaper than networkidle. (`sb-show-main` on <body> is set before
    // the story renders, so waiting on it checked an empty page and passed
    // with the bug present.)
    await page.goto(`/iframe.html?id=${s.id}&globals=theme:light;vr:true`, { waitUntil: "load" });
    await page.waitForFunction(() => {
      const preview = (window as unknown as { __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } } })
        .__STORYBOOK_PREVIEW__;
      return preview?.currentRender?.phase === "finished";
    });
    const strays = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const stacks = ["sans", "mono", "serif", "display"].map((r) => {
        const probe = document.createElement("span");
        probe.style.fontFamily = root.getPropertyValue(`--psi-font-${r}`);
        document.body.append(probe);
        const family = getComputedStyle(probe).fontFamily;
        probe.remove();
        return family;
      });
      const out: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.textContent?.trim();
        const el = n.parentElement;
        if (!text || !el || el.closest("script, style, #storybook-docs")) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || el.getClientRects().length === 0) continue;
        if (!stacks.includes(cs.fontFamily)) out.push(`${el.tagName.toLowerCase()} "${text.slice(0, 30)}" in ${cs.fontFamily}`);
      }
      return out;
    });
    expect(strays).toEqual([]);
  });
}
