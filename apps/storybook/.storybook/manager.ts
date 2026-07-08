import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

// Brand link points back to the website — same origin in production
// (promo at /, storybook at /storybook/; see tools/assemble-site.mjs).
addons.setConfig({
  theme: create({
    base: "light",
    brandTitle: "DS design system",
    brandUrl: "/",
    brandTarget: "_self",
  }),
});
