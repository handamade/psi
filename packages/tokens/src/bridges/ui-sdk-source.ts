import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

// D146: the pinned devDependency is the only UI SDK the bridge is built from.
const require = createRequire(import.meta.url);

export function readUiSdkWebCss(): string {
  return readFileSync(require.resolve("@ui-sdk/core/web.css"), "utf8");
}

export function uiSdkVersion(): string {
  return (require("@ui-sdk/core/package.json") as { version: string }).version;
}
