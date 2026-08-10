import { describe, it, expect } from "vitest";
import { deriveTheme } from "../src/generate/derive.js";
import { parsePrompt } from "../src/generate/prompt.js";
import { serializeCustomerTheme } from "../src/generate/serialize.js";

const pair = deriveTheme(parsePrompt("sunset over the atlantic"));
const out = serializeCustomerTheme(pair);

describe("serializeCustomerTheme", () => {
  it("names the file after the vector", () => {
    expect(out.filename).toBe("sunset-over-the-atlantic.ts");
  });

  it("imports only from the package's own dsl", () => {
    expect(out.source).toContain('from "../../dsl/types.js"');
  });

  it("exports one palette and two slot maps", () => {
    expect(out.source).toMatch(/export const \w+Palette: Palette = \{/);
    expect(out.source).toMatch(/export const \w+Slots: SlotMap = \{/);
    expect(out.source).toMatch(/export const \w+DarkSlots: SlotMap = \{/);
  });

  it("registers both members, the second based on dark", () => {
    expect(out.registration).toContain('base: "dark"');
    expect(out.registration).toContain("sunsetOverTheAtlanticSlots");
    expect(out.registration).toContain("sunsetOverTheAtlanticDarkSlots");
  });

  it("emits the control radius as an on-scale rung", () => {
    expect(out.source).toMatch(/"control-radius": "var\(--psi-radius-(4|6|8|12)\)"/);
  });

  it("emits no raw hex — the file is formulas and anchors, not swatches", () => {
    expect(out.source).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("carries the solved AA overrides for BOTH members", () => {
    // Without these the emitted file is not merely a different theme — the
    // token build's WCAG gate throws on it, because the default formulas miss
    // the matrix on generated palettes. That is why solveOverrides exists.
    expect(out.source).toMatch(/export const \w+Overrides: ThemeDef = \{/);
    expect(out.source).toMatch(/export const \w+DarkOverrides: ThemeDef = \{/);
    expect(out.source).toContain("token({ from: slot.accent");
    expect(out.registration).toContain("overrides:");
    expect(out.registration).toContain("DarkOverrides");
  });

  it("emits overrides that reproduce the derived theme exactly", () => {
    // Round-trip on the values, not the text: every solved op in the emitted
    // source must equal the op deriveTheme actually produced. A serializer
    // that rounds, reorders or drops an op would render a theme that differs
    // from the one the console previewed and the AA sweep validated.
    for (const [member, marker] of [
      [pair.light, "Overrides"],
      [pair.dark, "DarkOverrides"],
    ] as const) {
      for (const [name, def] of Object.entries(member.customerTheme.overrides ?? {})) {
        expect(out.source, `${marker} ${name}`).toContain(`${name}: token({`);
        if (def.l) expect(out.source).toContain(`l: set(${def.l.value})`);
        if (def.c) expect(out.source).toContain(`c: cap(${def.c.value})`);
      }
    }
  });

  it("round-trips: every anchor in the source matches the derived palette", () => {
    const palette = pair.light.customerTheme.palette;
    for (const [name, entry] of Object.entries(palette)) {
      if (name === "white" || name === "black") continue;
      expect(out.source, name).toContain(`${name}: { l: ${entry.l}`);
    }
  });
});
