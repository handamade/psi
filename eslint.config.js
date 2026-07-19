import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/*.css", "**/storybook-static/**", "site-dist/**", ".worktrees/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { "@typescript-eslint/consistent-type-imports": "error" } },
  {
    // Plain-JS Node scripts (build/config files). TS files get `no-undef`
    // turned off by tseslint's recommended config (TS itself catches
    // unresolved identifiers), but .mjs/.cjs scripts are untyped and run
    // directly under Node, so declare the Node globals they actually use
    // instead of disabling no-undef outright.
    files: ["**/*.mjs", "**/*.cjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
      },
    },
  },
);
