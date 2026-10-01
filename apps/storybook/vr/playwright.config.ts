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
  // threshold 0. The old maxDiffPixelRatio 0.001 (~800+ px on a full-page
  // shot) additionally masked any small-element diff.
  //
  // D89: the budget is 0. HAN-20 set it to 48, "above the noise floor (0) and
  // below the smallest label signal (54)" — but a smaller signal existed: D81's
  // Select chevron (contrast 1.71 → 8.48 in ember) measures 7–10 px per
  // chevron here and passed as noise for three days. A CI run at budget 0
  // failed exactly those 18 screenshots and passed the other 506 at 0 diff
  // pixels, so there is no noise for a budget to absorb. If a screenshot ever
  // fails with no source change, record its count before raising this.
  expect: { toHaveScreenshot: { maxDiffPixels: 0, threshold: 0.02, animations: "disabled" } },
  use: {
    viewport: { width: 1000, height: 800 },
    deviceScaleFactor: 1,
    // Escape hatch for Linux dev containers whose pre-installed Chromium is a
    // different build than this Playwright pins — the launcher then aborts with
    // "Executable doesn't exist at .../chromium_headless_shell-<n>/..." and no
    // baseline can be generated at all. Point PSI_VR_CHROMIUM at the Chromium
    // that *is* present. Unset in CI, so CI's render is untouched; see
    // vr/README.md for which baselines are safe to generate this way.
    launchOptions: process.env.PSI_VR_CHROMIUM
      ? { executablePath: process.env.PSI_VR_CHROMIUM }
      : {},
  },
  webServer: {
    // `serve`'s default cleanUrls behavior 301-redirects /iframe.html -> /iframe and drops
    // the query string in the process, so every story loads with no id/theme selected
    // (Storybook's "No Preview" screen). serve.json disables cleanUrls to keep query params intact.
    command: "npx serve -l 6208 -c ../vr/serve.json ../storybook-static",
    port: 6208,
    reuseExistingServer: !process.env.CI,
  },
});
