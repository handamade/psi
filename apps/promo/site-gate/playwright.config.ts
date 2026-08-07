import { defineConfig } from "@playwright/test";

/**
 * The public site's own gate (D76). Deliberately NOT `vr`:
 * no screenshot assertions, so it is platform-independent and runs locally.
 * `vr` stays CI-only because its baselines are ubuntu renders.
 *
 * Requires `pnpm --dir apps/promo build` first — the webServer serves dist/.
 */
export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: 0,
  workers: 2,
  use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  webServer: {
    command: "npx serve -l 6210 ../dist",
    port: 6210,
    reuseExistingServer: !process.env.CI,
  },
});
