import { describe, expect, it } from "vitest";
import { checkScopes, checkOverrideScopes } from "../src/scope-gate.js";
import { token, slot, ref } from "../src/dsl/builders.js";
import type { ThemeDef } from "../src/dsl/types.js";
// The real inventory — the positive gate: current bindings must be clean.
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import { buttonVars } from "../src/components/button.js";
import { cardVars } from "../src/components/card.js";
import { checkboxVars } from "../src/components/checkbox.js";
import { dialogVars } from "../src/components/dialog.js";
import { fieldVars } from "../src/components/field.js";
import { inputVars } from "../src/components/input.js";
import { mediaVars } from "../src/components/media.js";
import { navbarVars } from "../src/components/navbar.js";
import { panelVars } from "../src/components/panel.js";
import { selectVars } from "../src/components/select.js";
import { surfaceVars } from "../src/components/surface.js";
import { switchVars } from "../src/components/switch.js";
import { tagVars } from "../src/components/tag.js";
import { tooltipVars } from "../src/components/tooltip.js";

const allVars = {
  button: buttonVars, card: cardVars, checkbox: checkboxVars, dialog: dialogVars,
  field: fieldVars, input: inputVars, media: mediaVars, navbar: navbarVars, panel: panelVars,
  select: selectVars, surface: surfaceVars, switch: switchVars, tag: tagVars, tooltip: tooltipVars,
};

const miniTheme: ThemeDef = {
  fgMuted: token({ from: slot.ink, scopes: ["text"] }),
  fillBase: token({ from: slot.canvas, scopes: ["surface"] }),
  borderLine: token({ from: ref.fgMuted, scopes: ["border"] }),
  legacy: token({ from: slot.ink }), // unscoped
};

describe("scope gate (D46)", () => {
  // ── the spec's own motivating example ──
  it("flags a text token bound to a -bg key", () => {
    const v = checkScopes({ widget: { "accent-bg": "var(--psi-fg-muted)" } }, miniTheme);
    expect(v).toEqual([{ component: "widget", key: "accent-bg", group: "surface", token: "fgMuted", scopes: ["text"] }]);
  });

  it("flags a surface token bound to a -fg key", () => {
    const v = checkScopes({ widget: { "label-fg": "var(--psi-fill-base)" } }, miniTheme);
    expect(v).toHaveLength(1);
    expect(v[0].token).toBe("fillBase");
  });

  it("passes matching bindings and unscoped tokens", () => {
    expect(checkScopes({ widget: {
      "label-fg": "var(--psi-fg-muted)",
      "panel-bg": "var(--psi-fill-base)",
      "rim-border": "var(--psi-border-line)",
      "anything-bg": "var(--psi-legacy)",
    } }, miniTheme)).toEqual([]);
  });

  it("sees through oklch(from var()) derivations", () => {
    const v = checkScopes({ widget: {
      "hover-bg": "oklch(from var(--psi-fg-muted) calc(l - 0.04) c h)",
    } }, miniTheme);
    expect(v).toHaveLength(1);
  });

  it("follows own-token chains to the semantic binding", () => {
    const v = checkScopes({ widget: {
      "accent-bg": "var(--psi-fg-muted)",
      "accent-bg-hover": "oklch(from var(--psi-widget-accent-bg) calc(l - 0.04) c h)",
    } }, miniTheme);
    // both the direct binding and the derived one land on fgMuted-as-surface
    expect(v).toHaveLength(2);
  });

  it("skips unsuffixed keys and scale tokens", () => {
    expect(checkScopes({ widget: {
      "focus-ring": "var(--psi-fg-muted)",
      "pad": "var(--psi-space-8)",
      "label-fg": "var(--psi-text-15-24-regular)",
    } }, miniTheme)).toEqual([]);
  });

  it("flags a binding to a nonexistent token as a violation", () => {
    const v = checkScopes({ widget: { "label-fg": "var(--psi-fg-mutted)" } }, miniTheme);
    expect(v).toHaveLength(1);
    expect(v[0].scopes).toEqual([]);
  });

  // ── cross-family refs (D51: dialog/panel bind --psi-surface-*) ──
  it("follows cross-family refs to their semantic scopes", () => {
    const vars = {
      surface: { bg: "var(--psi-fill-base)" },
      widget: { "accent-bg": "var(--psi-surface-bg)" },
    };
    expect(checkScopes(vars, miniTheme)).toEqual([]);
  });
  it("flags a cross-family ref that lands on a wrong-scope token", () => {
    const vars = {
      surface: { border: "var(--psi-border-line)" },
      widget: { "accent-bg": "var(--psi-surface-border)" },
    };
    expect(checkScopes(vars, miniTheme)).toEqual([
      { component: "widget", key: "accent-bg", group: "surface", token: "borderLine", scopes: ["border"] },
    ]);
  });

  // ── the real inventory is clean, in every theme ──
  const themes = {
    light: lightTheme, dark: darkTheme,
    ...Object.fromEntries(Object.entries(customerThemes).map(([n, c]) => [n, assembleCustomerTheme(c)])),
  };
  it.each(Object.entries(themes))("real component bindings pass in %s", (_name, theme) => {
    expect(checkScopes(allVars, theme)).toEqual([]);
  });

  it("real customer componentOverrides pass", () => {
    for (const [name, c] of Object.entries(customerThemes)) {
      expect(checkOverrideScopes(c.componentOverrides ?? {}, allVars, themes[name as keyof typeof themes])).toEqual([]);
    }
  });

  it("flags an out-of-scope componentOverride", () => {
    const v = checkOverrideScopes({ "widget-accent-bg": "var(--psi-fg-muted)" }, { widget: {} }, miniTheme);
    expect(v).toHaveLength(1);
  });
});

describe("page-scoped overrides bind no theme colour (D139)", () => {
  // Imported here so this block reads on its own; the registry is the real one.
  const registry = () => import("../src/components/registry.js").then((m) => m.componentVars);

  it.each([
    ["app-shell-sidebar-width", "var(--psi-fg-primary)", "fgPrimary"],
    ["control-radius", "calc(var(--psi-radius-8) + 0px * var(--psi-border-faint))", "borderFaint"],
    ["media-tint", "drop-shadow(0 0 4px var(--psi-palette-sapphire))", "--psi-palette-sapphire"],
    ["navbar-blur", "var(--psi-navbar-fg)", "fgPrimary"],
  ])("refuses %s: %s", async (key, value, token) => {
    const violations = checkOverrideScopes({ [key]: value }, await registry(), lightTheme);
    expect(violations).toContainEqual(expect.objectContaining({ group: "page", token }));
  });

  it.each([
    ["app-shell-sidebar-width", "18rem"],
    ["control-radius", "var(--psi-radius-4)"],
    ["navbar-gutter", "var(--psi-space-16)"],
    ["button-radius", "var(--psi-control-radius)"],
    ["media-tint", "grayscale(1)"],
  ])("accepts %s: %s", async (key, value) => {
    expect(checkOverrideScopes({ [key]: value }, await registry(), lightTheme)).toEqual([]);
  });

  it("leaves a colour key to the D46 check: a colour there is the point", async () => {
    expect(checkOverrideScopes({ "card-bg": "var(--psi-bg-secondary)" }, await registry(), lightTheme)).toEqual([]);
  });
});

describe("a duration token reaches reduced motion (D141)", () => {
  const registry = () => import("../src/components/registry.js").then((m) => m.componentVars);

  it.each([
    "var(--psi-duration-150)",
    "var(--psi-duration-600)",
    "var(--psi-motion-move-duration)",
    "var(--psi-motion-feedback-duration)",
  ])("accepts an override of %s", async (value) => {
    expect(checkOverrideScopes({ "widget-open-duration": value }, { widget: {} }, lightTheme)).toEqual([]);
    expect(checkOverrideScopes({ "toast-duration": value }, await registry(), lightTheme)).toEqual([]);
  });

  it.each([
    "200ms",
    "0.2s",
    "calc(var(--psi-duration-150) * 2)",
    "var(--psi-duration-150, 1s)",
    "var(--psi-duration-175)",
    "var(--psi-motion-nope-duration)",
    "var(--psi-motion-move-ease)",
    "var(--psi-space-8)",
  ])("refuses an override of %s", (value) => {
    const v = checkOverrideScopes({ "widget-open-duration": value }, { widget: {} }, lightTheme);
    expect(v).toEqual([expect.objectContaining({ component: "widget", key: "open-duration", group: "duration", token: value })]);
  });

  it("checks a -duration key whose component Psi does not know", () => {
    const v = checkOverrideScopes({ "my-thing-duration": "120ms" }, { widget: {} }, lightTheme);
    expect(v).toEqual([expect.objectContaining({ group: "duration", token: "120ms" })]);
  });

  it("holds Psi's own registry to the same rule", async () => {
    expect(checkScopes(await registry(), lightTheme).filter((v) => v.group === "duration")).toEqual([]);
    expect(checkScopes({ widget: { "open-duration": "200ms" } }, lightTheme)).toEqual([
      expect.objectContaining({ group: "duration", token: "200ms" }),
    ]);
  });

  it("leaves the -ease half alone: a literal curve cannot break reduced motion", () => {
    expect(checkOverrideScopes({ "widget-open-ease": "cubic-bezier(0, 0, 1, 1)" }, { widget: {} }, lightTheme)).toEqual([]);
  });
});

describe("gateTheme refuses a theme whose duration would not zero (D141)", () => {
  it("names the key, the value and the accepted forms", async () => {
    const { gateTheme } = await import("../src/theme/gate.js");
    const { defaultPalette, defaultSlots } = await import("../src/palettes/default.js");
    expect(() => gateTheme("slowpoke", lightTheme, defaultPalette, defaultSlots, { "app-shell-sidebar-duration": "300ms" }))
      .toThrow(/--psi-app-shell-sidebar-duration is 300ms.*var\(--psi-duration-<step>\).*var\(--psi-motion-<preset>-duration\)/);
  });
});
