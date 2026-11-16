import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/*",
  "apps/storybook",
  "apps/site",
  "api",
  "tools",
]);
