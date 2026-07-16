import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: 0,
  workers: 4,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: "disabled" } },
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
