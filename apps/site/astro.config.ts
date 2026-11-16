import react from "@astrojs/react";
import { defineConfig } from "astro/config";

import { psiFacts } from "./vite-plugin-psi-facts";

export default defineConfig({
  site: "https://psi.kurkin.de",
  output: "static",
  // Keep Astro 6's whitespace handling: the homepage's inline runs were
  // written against it (Astro 7 defaults compressHTML to "jsx").
  compressHTML: true,
  integrations: [react()],
  vite: { plugins: [psiFacts()] },
  server: { port: 5199 },
});
