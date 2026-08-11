import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // site-gate/**/*.spec.ts are Playwright specs (run via `pnpm test:site`,
    // config at site-gate/playwright.config.ts, per the root `test:site`
    // script) — vitest's default include glob would otherwise pick them up
    // too and fail with "test() called here" errors, same pitfall documented
    // in apps/storybook/vitest.config.ts for vr/**/*.spec.ts.
    include: ["src/**/*.test.ts"],
  },
});
