import type { Preview } from "storybook";
import { createElement } from "react";

import "@dku/tokens/base.css";
import "@dku/tokens/light.css";
import "@dku/tokens/dark.css";
import "@dku/tokens/acme.css";
import "@dku/tokens/utilities.css";
import "@dku/tokens/components.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Design system theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
          { value: "acme", title: "Acme", icon: "paintbrush" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme ?? "light";
      return createElement(
        "div",
        { "data-ds-theme": theme, style: { padding: "1rem" } },
        createElement(Story),
      );
    },
  ],
};

export default preview;
