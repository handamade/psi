import { describe, it, expect } from "vitest";
import { deriveTheme } from "../src/generate/derive.js";
import { parsePrompt } from "../src/generate/prompt.js";
import { serializeCustomerTheme } from "../src/generate/serialize.js";

const pair = deriveTheme(parsePrompt("sunset over the atlantic"));
const out = serializeCustomerTheme(pair);

/** Extract the body of the `export const \w+<marker>: ThemeDef = { ... };`
 * block whose identifier ends in `marker` ("Overrides" or "DarkOverrides").
 * Needed because `marker` "Overrides" is itself a suffix of "DarkOverrides"
 * — matching leftmost-first against the whole source (rather than requiring
 * an exact identifier) still lands on the light block for "Overrides" since
 * it appears earlier in the file, and only the dark block's identifier ends
 * in "DarkOverrides". */
function overridesBlock(source: string, marker: "Overrides" | "DarkOverrides"): string {
  const re = new RegExp(`export const \\w+${marker}: ThemeDef = \\{([\\s\\S]*?)\\n\\};`);
  const m = source.match(re);
  expect(m, `expected a ${marker} block`).toBeTruthy();
  return m![1]!;
}

/** The single line for one override entry within a given block — anchors an
 * assertion to the entry it names, not to the source file as a whole. */
function overrideLine(block: string, name: string): string {
  const re = new RegExp(`^  ${name}: token\\(\\{.*\\}\\),$`, "m");
  const m = block.match(re);
  expect(m, `expected a line for ${name}`).toBeTruthy();
  return m![0];
}

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

  it("quotes BOTH registration keys — a kebab slug is not a bare identifier", () => {
    // The light-member key is a kebab slug too ("sunset-over-the-atlantic"),
    // which is invalid as a bare object key. Leaving it unquoted while
    // quoting only the dark key is a syntax error the moment this text is
    // spliced into customers/index.ts, for every multi-word prompt.
    expect(out.registration).toMatch(/^\s*"sunset-over-the-atlantic":/m);
    expect(out.registration).toMatch(/^\s*"sunset-over-the-atlantic-dark":/m);
  });

  it("imports only the DSL builders the emitted overrides actually use", () => {
    // solveOverrides only ever emits `from: slot.<name>` with `set`/`cap`
    // ops — `delta` and `ref` are structurally unreachable in its output.
    // Importing them anyway would fail this repo's
    // `@typescript-eslint/no-unused-vars` lint gate on every generated file.
    const importLine = out.source.match(/^import \{[^}]*\} from "\.\.\/\.\.\/dsl\/builders\.js";$/m);
    expect(importLine, "expected a builders import line").toBeTruthy();
    expect(importLine![0]).not.toMatch(/\bdelta\b/);
    expect(importLine![0]).not.toMatch(/\bref\b/);
    expect(importLine![0]).toMatch(/\bset\b/);
    expect(importLine![0]).toMatch(/\bcap\b/);
    expect(importLine![0]).toMatch(/\bslot\b/);
    expect(importLine![0]).toMatch(/\btoken\b/);
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
    //
    // Assertions are anchored to the SPECIFIC override's own line, within
    // the SPECIFIC member's block — not a bare `source.toContain(...)` over
    // the whole ~700-line file. An unanchored check can't tell a correct
    // emission from two overrides having their l/c values transposed: both
    // literals would still appear *somewhere* in the document either way.
    for (const [member, marker] of [
      [pair.light, "Overrides"],
      [pair.dark, "DarkOverrides"],
    ] as const) {
      const block = overridesBlock(out.source, marker);
      for (const [name, def] of Object.entries(member.customerTheme.overrides ?? {})) {
        const line = overrideLine(block, name);
        expect(line, `${marker} ${name}`).toContain(`${name}: token({`);
        if (def.l) expect(line, `${marker} ${name} l`).toContain(`l: set(${def.l.value})`);
        if (def.c) expect(line, `${marker} ${name} c`).toContain(`c: cap(${def.c.value})`);
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
