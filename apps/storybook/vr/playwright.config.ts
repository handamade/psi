import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: 0,
  workers: 4,
  // HAN-20: the ember fgOnAccent AAA fix (#25211c → #0c0805, every accent-button
  // label) produced ZERO diff pixels at the default per-pixel threshold 0.2 —
  // and still zero at 0.1 — so no pixel-count limit alone could catch it. At
  // 0.02 the label class measures 54–439px per story; same-environment
  // re-renders measure exactly 0 diff pixels across all stories even at
  // threshold 0. maxDiffPixels 48 sits above that noise floor (0) and below
  // the smallest label signal; the old maxDiffPixelRatio 0.001 (~800+ px on a
  // full-page shot) additionally masked any small-element diff.
  expect: { toHaveScreenshot: { maxDiffPixels: 48, threshold: 0.02, animations: "disabled" } },
  use: { viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 },
  webServer: {
    // `serve`'s default cleanUrls behavior 301-redirects /iframe.html -> /iframe and drops
    // the query string in the process, so every story loads with no id/theme selected
    // (Storybook's "No Preview" screen). serve.json disables cleanUrls to keep query params intact.
    command: "npx serve -l 6208 -c ../vr/serve.json ../storybook-static",
    port: 6208,
    reuseExistingServer: !process.env.CI,
  },
});
