import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // vr/**/*.spec.ts are Playwright specs (run via `pnpm vr` / `pnpm test:e2e`,
    // config at vr/playwright.config.ts) — vitest's default include glob would
    // otherwise pick them up too and fail with "test() called here" errors.
    include: ["scripts/**/*.test.ts"],
  },
});
