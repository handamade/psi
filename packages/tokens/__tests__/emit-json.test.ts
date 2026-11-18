import { describe, expect, it } from "vitest";
import { emitResolvedJSON } from "../scripts/emit-json.js";
import { resolve } from "../src/dsl/resolver.js";
import { lightTheme } from "../src/themes/light.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";

describe("emitResolvedJSON (D46 scopes)", () => {
  const json = JSON.parse(emitResolvedJSON("light", resolve(lightTheme, defaultPalette, defaultSlots), "light"));
  it("carries the theme's color scheme beside its name (D116)", () => {
    expect(json.colorScheme).toBe("light");
    expect(Object.keys(json).slice(0, 2)).toEqual(["theme", "colorScheme"]);
  });
  it("tokens carry scopes", () => {
    expect(json.tokens.fgPrimary.scopes).toEqual(["text"]);
    expect(json.tokens.fgDanger.scopes).toEqual(["text", "border"]);
  });
  it("scales carry family scopes", () => {
    expect(json.scales.scopes).toEqual({ space: ["gap"] });
  });
  it("scales carry the motion presets with their tokens and intent (D141)", () => {
    expect(json.scales.motion.presets.move).toMatchObject({
      duration: 200,
      ease: "soft",
      durationToken: "--psi-motion-move-duration",
      easeToken: "--psi-motion-move-ease",
    });
    expect(Object.keys(json.scales.motion.presets)).toEqual(["feedback", "move", "emphasis"]);
  });
  it("scales carry the focus ring (D82)", () => {
    expect(json.scales.focusRing).toEqual({ width: 2, offset: 2, offsetInset: -2 });
  });
});
