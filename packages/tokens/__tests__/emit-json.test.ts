import { describe, expect, it } from "vitest";
import { emitResolvedJSON } from "../scripts/emit-json.js";
import { resolve } from "../src/dsl/resolver.js";
import { lightTheme } from "../src/themes/light.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";

describe("emitResolvedJSON (D46 scopes)", () => {
  const json = JSON.parse(emitResolvedJSON("light", resolve(lightTheme, defaultPalette, defaultSlots)));
  it("tokens carry scopes", () => {
    expect(json.tokens.fgPrimary.scopes).toEqual(["text"]);
    expect(json.tokens.fgDanger.scopes).toEqual(["text", "border"]);
  });
  it("scales carry family scopes", () => {
    expect(json.scales.scopes).toEqual({ space: ["gap"] });
  });
});
