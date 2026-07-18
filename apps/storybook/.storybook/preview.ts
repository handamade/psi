import type { Preview } from "storybook";
import { createElement } from "react";

import "@handamade/psi-tokens/base.css";
import "@handamade/psi-tokens/light.css";
import "@handamade/psi-tokens/dark.css";
import "@handamade/psi-tokens/acme.css";
import "@handamade/psi-tokens/ember.css";
import "@handamade/psi-tokens/utilities.css";
import "@handamade/psi-tokens/components.css";

const preview: Preview = {
  // Generated docs page per component — public link targets for the website
  tags: ["autodocs"],
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
          { value: "ember", title: "Ember", icon: "circlehollow" },
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
        { "data-psi-theme": theme, style: { padding: "1rem" } },
        createElement(Story),
      );
    },
  ],
};

export default preview;
