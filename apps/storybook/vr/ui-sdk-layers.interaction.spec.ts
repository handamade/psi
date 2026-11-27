import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

/** D146 — the bridge wins over UI SDK's own tokens, and loses to nothing Psi
 * does not intend, under both layer lines the guide gives. The CSS is inlined
 * because Storybook's preview declares Psi's layers before any story CSS
 * loads, so a story cannot test an order a consumer controls. No screenshots. */

const tokensDir = join(import.meta.dirname, "../../../packages/tokens");
const dist = (f: string) => readFileSync(join(tokensDir, "dist", f), "utf8");
const webCss = readFileSync(createRequire(join(tokensDir, "package.json")).resolve("@ui-sdk/core/web.css"), "utf8");

const PLAIN = "@layer ui-sdk, psi.base, psi.theme, psi.components, psi.utilities, psi.ui-sdk;";
const TAILWIND = "@layer theme, base, components, psi.base, psi.theme, psi.components, psi.utilities, psi.ui-sdk, utilities;";

const page = (layerLine: string, sdk: string) => `<!doctype html><html><head>
<style>${layerLine}</style>
<style>${dist("base.css")}</style><style>${dist("light.css")}</style><style>${dist("dark.css")}</style>
<style>${dist("components.css")}</style><style>${dist("utilities.css")}</style>
<style>${sdk}</style><style>${dist("ui-sdk.css")}</style>
</head><body>
  <section id="light"><button data-slot="button" type="button">Light</button><i class="probe"></i></section>
  <section id="dark" data-psi-theme="dark"><button data-slot="button" type="button">Dark</button><i class="probe"></i></section>
</body></html>`;

for (const [name, layerLine, sdk] of [
  ["plain", PLAIN, webCss],
  ["tailwind", TAILWIND, `@layer components { ${webCss} }`],
] as const) {
  for (const scope of ["light", "dark"] as const) {
    test(`ui-sdk bridge, ${name} layer line, ${scope} @interaction`, async ({ page: p }) => {
      await p.setContent(page(layerLine, sdk));
      const read = (sel: string, prop: string) =>
        p.locator(sel).evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(), prop);
      const s = `#${scope}`;
      expect(await read(s, "--ui-background")).toBe(await read(s, "--psi-bg-primary"));
      expect(await read(s, "--ui-primary")).toBe(await read(s, "--psi-fill-accent"));
      expect(await read(s, "--ui-ring")).toBe(await read(s, "--psi-border-focus"));
      expect(await read(s, "color-scheme")).toBe(scope);

      // The ring: focus by keyboard so :focus-visible matches.
      await p.locator(`${s} .probe`).evaluate((el) => {
        const probe = el as HTMLElement;
        probe.style.display = "block";
        probe.style.width = "var(--psi-focus-ring-width)";
      });
      const ringWidth = await read(`${s} .probe`, "width");
      await p.keyboard.press("Tab");
      if (scope === "dark") await p.keyboard.press("Tab");
      await expect(p.locator(`${s} button`)).toBeFocused();
      expect(await read(`${s} button`, "outline-width")).toBe(ringWidth);
    });
  }
}
