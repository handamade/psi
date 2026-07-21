import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface IndexEntry { id: string; type: string; title: string; }
// Root package.json has "type": "module", so this spec runs as ESM under Playwright's
// loader — __dirname isn't defined there. Use import.meta.dirname (Node 20.11+) instead.
const index = JSON.parse(
  readFileSync(join(import.meta.dirname, "../storybook-static/index.json"), "utf8"),
) as { entries: Record<string, IndexEntry> };

const stories = Object.values(index.entries).filter((e) => e.type === "story");
// D41 matrix: component stories in light+ember; token-docs pages in all 4 themes.
const themesFor = (e: IndexEntry) =>
  e.title.toLowerCase().includes("tokens") ? ["light", "dark", "acme", "ember"] : ["light", "ember"];

for (const s of stories) {
  for (const theme of themesFor(s)) {
    test(`${s.id} @ ${theme}`, async ({ page }) => {
      // `vr:true` tells play functions they run for the camera (tooltip
      // stories open their bubbles only then — HAN-39).
      await page.goto(`/iframe.html?id=${s.id}&globals=theme:${theme};vr:true`, { waitUntil: "networkidle" });
      if (s.id.startsWith("components-tooltip")) {
        // Tooltip stories open the bubble via a play fn (hover + 150ms delay);
        // wait for it deterministically instead of racing the fixed settle below.
        await page.waitForSelector('[role="tooltip"]', { state: "visible", timeout: 5000 });
      }
      await page.waitForTimeout(250); // fonts/HMR-free settle
      await expect(page).toHaveScreenshot(`${s.id}--${theme}.png`, { fullPage: true });
    });
  }
}
