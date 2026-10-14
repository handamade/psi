import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { psiComponentsLayer } from "./scripts/components-layer";

export default defineConfig({
  plugins: [react()],
  // D94: every component rule ships in @layer psi.components.
  css: { postcss: { plugins: [psiComponentsLayer()] } },
  build: {
    lib: { entry: "src/index.ts", formats: ["es"], fileName: "index" },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: { assetFileNames: "styles[extname]" },
    },
    cssCodeSplit: false,
  },
});
