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
import { selectVars } from "../src/components/select.js";
import { switchVars } from "../src/components/switch.js";
import { tagVars } from "../src/components/tag.js";
import { tooltipVars } from "../src/components/tooltip.js";

const allVars = {
  button: buttonVars, card: cardVars, checkbox: checkboxVars, dialog: dialogVars,
  field: fieldVars, input: inputVars, media: mediaVars, navbar: navbarVars,
  select: selectVars, switch: switchVars, tag: tagVars, tooltip: tooltipVars,
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
