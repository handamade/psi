import { describe, it, expect } from "vitest";
import { popupVars } from "../src/components/popup.js";
import { menuVars } from "../src/components/menu.js";
import { componentVars } from "../src/components/registry.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("popup tokens (D131)", () => {
  it("declares one shared maximum height, 320px", () => {
    expect(popupVars).toEqual({ "max-height": "320px" });
  });

  it("is registered, so the scope gate and the emitters see it", () => {
    expect(componentVars.popup).toBe(popupVars);
  });

  it("emits --psi-popup-max-height", () => {
    expect(emitComponentVarsCSS("popup", popupVars)).toContain("--psi-popup-max-height: 320px");
  });

  it("Menu aliases it rather than holding a value of its own", () => {
    expect(menuVars["max-height"]).toBe("var(--psi-popup-max-height)");
    expect(emitComponentVarsCSS("menu", menuVars)).toContain(
      "--psi-menu-max-height: var(--psi-popup-max-height)",
    );
  });

  it("carries no -fg/-bg/-border segment, so it stays out of the colour gates", async () => {
    const { keyGroup } = await import("../src/scopes.js");
    expect(keyGroup("max-height")).toBeUndefined();
  });
});
