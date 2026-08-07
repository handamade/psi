import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { psiFacts } from "./vite-plugin-psi-facts";

export default defineConfig({
  plugins: [react(), psiFacts()],
  server: { port: 5199, strictPort: true },
});
