import type { BrandFonts } from "../themes/customers/index.js";
import type { ChannelOp, PaletteEntry, SlotMap, ThemeDef } from "../dsl/types.js";
import type { DerivedPair } from "./derive.js";

/**
 * kebab-slug → camelCase identifier stem.
 *
 * The trailing `[^A-Za-z0-9]` strip and the `-+` (rather than `-`) are both
 * load-bearing. `-([a-z0-9])` alone left any hyphen with no following
 * alphanumeric in place: `ident("a--b")` returned `"a-B"` and `ident("ab-")`
 * returned `"ab-"` — a literal hyphen inside what is spliced in as a
 * TypeScript identifier, so the emitted `customers/<name>.ts` would not parse.
 * `parsePrompt`'s slugify cannot produce either shape, but `isBrandVector` and
 * `api/theme.ts` accept a model-supplied name, and that is the untrusted path.
 * Both now reject consecutive and trailing hyphens as well — this collapse is
 * the second line, not the only one.
 */
function ident(name: string): string {
  return name
    .replace(/-+([a-z0-9])/g, (_, ch: string) => ch.toUpperCase())
    .replace(/[^A-Za-z0-9]/g, "");
}

function entryLine(name: string, e: PaletteEntry): string {
  return `  ${name}: { l: ${e.l}, c: ${e.c}, h: ${e.h} },`;
}

function slotsLiteral(slots: SlotMap): string {
  return (Object.entries(slots) as [string, string][])
    .map(([k, v]) => `  ${k}: "${v}",`)
    .join("\n");
}

function opLiteral(op: ChannelOp): string {
  return `${op.op}(${op.value})`;
}

/** Which of the DSL's builder functions actually appear in the given
 * overrides body text — `set`/`cap` from ChannelOp literals, `slot`/`ref`
 * from `from:` sources, `token` wrapping each entry, `delta` only if a
 * DeltaOp was emitted. `solveOverrides` never emits `delta` or `ref` today
 * (it only sets l/c against a slot anchor), so importing them unconditionally
 * would name two identifiers no emitted file ever uses — an
 * `@typescript-eslint/no-unused-vars` error under this repo's lint config,
 * which is one of the five required gates. */
function usedBuilders(overridesBody: string): string[] {
  const builders = ["cap", "delta", "ref", "set", "slot", "token"] as const;
  return builders.filter((b) => new RegExp(`\\b${b}[.(]`).test(overridesBody));
}

/**
 * Serialize the solved AA overrides.
 *
 * These are NOT optional decoration. The default theme formulas fail the
 * contrast matrix on most generated palettes — that is the entire reason
 * `solveOverrides` exists — so a `customers/<name>.ts` emitted without them
 * would not merely render differently from the console preview: it would
 * throw in the token build, whose WCAG gate runs over every committed theme.
 * An unbuildable file is not "a real customer theme out".
 *
 * The emitted shape matches `acmeOverrides` in `customers/acme.ts`, which
 * carries exactly this kind of per-hue correction by hand.
 */
function overridesLiteral(overrides: ThemeDef): string {
  return Object.entries(overrides)
    .map(([name, def]) => {
      const parts: string[] = [];
      if (def.from.type === "slot") parts.push(`from: slot.${def.from.name}`);
      else parts.push(`from: ref.${def.from.name}`);
      if (def.l) parts.push(`l: ${opLiteral(def.l)}`);
      if (def.c) parts.push(`c: ${opLiteral(def.c)}`);
      if (def.h) parts.push(`h: ${opLiteral(def.h)}`);
      if (def.alpha !== undefined) parts.push(`alpha: ${def.alpha}`);
      if (def.scopes) parts.push(`scopes: ${JSON.stringify(def.scopes)}`);
      return `  ${name}: token({ ${parts.join(", ")} }),`;
    })
    .join("\n");
}

/**
 * The brand's font-role block, in exactly the shape `customers/ember.ts`
 * carries by hand (`emberFonts`). Empty string when the vector names no
 * fonts, so a colour-only brand emits no block and no `BrandFonts` import.
 * `BrandFonts` comes from `./index.js` — a type-only import back into the
 * registry that imports this file, same as ember's, erased at build time.
 */
function fontsLiteral(id: string, fonts: BrandFonts | undefined): string {
  if (!fonts) return "";
  const body = (Object.entries(fonts) as [string, string][])
    .map(([role, stack]) => `  ${role}: ${JSON.stringify(stack)},`)
    .join("\n");
  return `
/** Brand-level font roles (D29). Psi ships no font files — the consumer loads
 * these webfonts; the roles travel with the theme so the emitted brand is the
 * whole vector, not just its colour half. */
export const ${id}Fonts: BrandFonts = {
${body}
};
`;
}

/**
 * Emit the `customers/<name>.ts` source for a derived pair, plus the two lines
 * that register it. Shape matches `scripts/new-theme.ts`, extended to a pair.
 */
export function serializeCustomerTheme(pair: DerivedPair): {
  filename: string;
  source: string;
  registration: string;
} {
  const { vector, light, dark } = pair;
  const id = ident(vector.name);
  const palette = light.customerTheme.palette;
  const radius = `var(--psi-radius-${vector.radius})`;

  // A prompt containing `editorial`, `technical` or `friendly` gives the
  // vector a font-role set (dictionaries.ts FONT_SETS), and `deriveMember`
  // puts it on the CustomerTheme — but it used to stop there: nothing emitted
  // it, so the copied-out source silently dropped half of what the prompt
  // asked for. Not applying fonts in the live preview is fine (the site loads
  // no webfonts); dropping them from the emitted brand is not.
  const fontsBlock = fontsLiteral(id, vector.fonts);

  const lightOverridesBody = overridesLiteral(light.customerTheme.overrides ?? {});
  const darkOverridesBody = overridesLiteral(dark.customerTheme.overrides ?? {});
  const builders = usedBuilders(`${lightOverridesBody}\n${darkOverridesBody}`);
  const buildersImport =
    builders.length > 0
      ? `import { ${builders.join(", ")} } from "../../dsl/builders.js";\n`
      : "";

  const fontsImport = fontsBlock ? `import type { BrandFonts } from "./index.js";\n` : "";

  const source = `${buildersImport}import type { Palette, SlotMap, ThemeDef } from "../../dsl/types.js";
${fontsImport}
// Generated by the Psi theme console from the prompt:
//   "${vector.name.replace(/-/g, " ")}"
// Every pair in the WCAG AA matrix is solved, in both modes, by construction.

export const ${id}Palette: Palette = {
${Object.entries(palette).map(([n, e]) => entryLine(n, e)).join("\n")}
};

/** Light member — ink is dark, canvas is light. */
export const ${id}Slots: SlotMap = {
${slotsLiteral(light.customerTheme.slots)}
};

/** Dark member — the same brand hue, lightness anchors inverted. */
export const ${id}DarkSlots: SlotMap = {
${slotsLiteral(dark.customerTheme.slots)}
};

/** Solved AA corrections for the light member. Without these the default
 * formulas miss the contrast matrix on this palette and the build throws. */
export const ${id}Overrides: ThemeDef = {
${lightOverridesBody}
};

/** Solved AA corrections for the dark member. */
export const ${id}DarkOverrides: ThemeDef = {
${darkOverridesBody}
};

${fontsBlock}
/** One dial for control shape (D56). */
export const ${id}ComponentOverrides: Record<string, string> = {
  "control-radius": "${radius}",
};
`;

  // BOTH keys are quoted. A kebab slug is not a valid bare object key, and
  // every multi-word prompt produces one. `fonts` is registered on both
  // members — an exported const nothing registers would be dead source, and
  // the brand's typography is not a light-mode-only property.
  const fontsField = fontsBlock ? `fonts: ${id}Fonts, ` : "";
  const registration = `  "${vector.name}": { palette: ${id}Palette, slots: ${id}Slots, overrides: ${id}Overrides, ${fontsField}componentOverrides: ${id}ComponentOverrides },
  "${vector.name}-dark": { palette: ${id}Palette, slots: ${id}DarkSlots, base: "dark", overrides: ${id}DarkOverrides, ${fontsField}componentOverrides: ${id}ComponentOverrides },`;

  return { filename: `${vector.name}.ts`, source, registration };
}
