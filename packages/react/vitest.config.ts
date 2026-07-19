import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        html: '<html><body></body></html>',
      },
    },
    setupFiles: ["./vitest.setup.ts"],
    css: { modules: { classNameStrategy: "non-scoped" } },
  },
});
