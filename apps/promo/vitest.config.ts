import { defineConfig } from "vitest/config";

import { psiFacts } from "./vite-plugin-psi-facts";

export default defineConfig({
  // Hero.tsx (Task 12's new unit tests) imports "virtual:psi-facts", the same
  // as Playground.tsx and Roadmap.tsx already did. vite.config.ts registers
  // this plugin for the dev/build graph; vitest has its own, separate plugin
  // list, so it needs the same registration or the import fails to resolve
  // ("Does the file exist?") the moment any test transitively imports Hero.
  plugins: [psiFacts()],
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
