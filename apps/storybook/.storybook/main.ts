import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import { psiComponentsLayer } from "../../../packages/react/scripts/components-layer";

const config: StorybookConfig = {
  stories: [
    "../src/**/*.stories.tsx",
    "../../../packages/react/src/**/*.stories.tsx",
  ],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  // D94: Storybook compiles the component CSS Modules from source, so it needs
  // the same layer wrap as the library build, or `vr` would render the old
  // cascade.
  viteFinal: (config) =>
    mergeConfig(config, { css: { postcss: { plugins: [psiComponentsLayer()] } } }),
};

export default config;
