import {
  ACCENT_CHROMA,
  CHROMA_WORDS,
  RADIUS_RUNGS,
  contrastReport,
  deriveTheme,
  parseColor,
  type BrandVector,
  type ChromaWord,
  type DerivedTheme,
  type RadiusRung,
} from "@handamade/psi-tokens/generate";

export interface ThemeInput {
  color?: string;
  hue?: number;
  chroma?: ChromaWord;
  radius?: RadiusRung;
  name?: string;
}

/** Bad input, or a theme the solver cannot bring to AA. The tool reports it
 * as isError; it never returns a theme that fails the gate. */
export class ThemeError extends Error {}

const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
/** Built-in theme names; a theme saved under one would override it. */
const RESERVED = ["light", "dark", "acme", "ember"];
const DEFAULT_RADIUS: RadiusRung = 8;

export function chromaWordFor(c: number): ChromaWord {
  return CHROMA_WORDS.reduce((best, w) =>
    Math.abs(ACCENT_CHROMA[w] - c) < Math.abs(ACCENT_CHROMA[best] - c) ? w : best,
  );
}

export function themeVector(input: ThemeInput): BrandVector {
  if (input.color !== undefined && input.hue !== undefined) {
    throw new ThemeError("Pass either color or hue, not both.");
  }
  let hue: number;
  let chroma: ChromaWord = input.chroma ?? "balanced";
  if (input.color !== undefined) {
    const parsed = parseColor(input.color);
    if (!parsed) {
      throw new ThemeError(`Could not read "${input.color}" as a colour. Pass a hex such as #3b82f6, or an oklch() string.`);
    }
    if (parsed.h === undefined) {
      throw new ThemeError(`"${input.color}" has no hue (it is a grey). Pass hue (0 to 359) instead.`);
    }
    hue = Math.round(parsed.h) % 360;
    chroma = input.chroma ?? chromaWordFor(parsed.c);
  } else if (input.hue !== undefined) {
    if (!Number.isFinite(input.hue) || input.hue < 0 || input.hue >= 360) {
      throw new ThemeError("hue must be from 0 to 359.");
    }
    hue = Math.round(input.hue) % 360;
  } else {
    throw new ThemeError("Pass color (a hex such as #3b82f6, or an oklch() string) or hue (0 to 359).");
  }
  if (!CHROMA_WORDS.includes(chroma)) {
    throw new ThemeError(`chroma must be one of ${CHROMA_WORDS.join(", ")}.`);
  }
  const radius = input.radius ?? DEFAULT_RADIUS;
  if (!RADIUS_RUNGS.includes(radius)) {
    throw new ThemeError(`radius must be one of ${RADIUS_RUNGS.join(", ")}.`);
  }
  const name = input.name ?? `brand-${hue}`;
  if (!NAME.test(name) || name.length > 64) {
    throw new ThemeError("name must be kebab-case (a-z, 0-9, single hyphens), at most 64 characters.");
  }
  if (RESERVED.some((r) => name === r || name === `${r}-dark`)) {
    throw new ThemeError(`"${name}" is reserved for a built-in theme (${RESERVED.join(", ")}, and their -dark forms). Pick another name.`);
  }
  return { hue, chroma, mode: "light", radius, name };
}

function memberCss(selector: string, member: DerivedTheme): string {
  const overrides = member.customerTheme.componentOverrides ?? {};
  const overrideProps = new Set(Object.keys(overrides).map((k) => `--psi-${k}`));
  const lines = [
    "@layer psi.theme {",
    `  ${selector} {`,
    `    color-scheme: ${member.mode};`,
    ...Object.entries(member.customProperties)
      .filter(([prop]) => !overrideProps.has(prop))
      .map(([prop, value]) => `    ${prop}: ${value};`),
    "  }",
    "}",
  ];
  if (overrideProps.size > 0) {
    lines.push(
      "@layer psi.components {",
      `  ${selector} {`,
      ...Object.entries(overrides).map(([k, v]) => `    --psi-${k}: ${v};`),
      "  }",
      "}",
    );
  }
  return lines.join("\n");
}

export function themeMarkdown(input: ThemeInput): string {
  const vector = themeVector(input);
  let pair: ReturnType<typeof deriveTheme>;
  try {
    pair = deriveTheme(vector);
  } catch (err) {
    throw new ThemeError(`The solver could not bring this theme to WCAG AA: ${(err as Error).message}`);
  }
  const { name } = vector;
  const light = contrastReport(pair.light);
  const dark = contrastReport(pair.dark);
  const source = input.color !== undefined ? `\`${input.color}\`` : `hue ${vector.hue}`;
  return (
    [
      `# Theme: ${name}`,
      `From ${source}: hue ${vector.hue}, chroma \`${vector.chroma}\`, radius ${vector.radius}. Light and dark were each solved so every gated pair meets WCAG AA.`,
      "## CSS",
      `Save as \`${name}.css\`.`,
      "```css\n" + memberCss(`[data-psi-theme="${name}"]`, pair.light) + "\n" + memberCss(`[data-psi-theme="${name}-dark"]`, pair.dark) + "\n```",
      "## Use it",
      "Import it after `light.css`, with the other stylesheets Psi needs:",
      "```ts\n" +
        [
          'import "@handamade/psi-tokens/base.css";',
          'import "@handamade/psi-tokens/light.css";',
          `import "./${name}.css";`,
          'import "@handamade/psi-tokens/components.css";',
          'import "@handamade/psi-tokens/utilities.css";',
          'import "@handamade/psi-react/styles";',
        ].join("\n") +
        "\n```",
      `Set \`data-psi-theme="${name}"\` on \`<html>\` or a subtree for light, and \`data-psi-theme="${name}-dark"\` for dark.`,
      "## Contrast",
      [
        "| Pair | Light | Dark | Minimum |",
        "|---|---|---|---|",
        ...light.map((r, i) => `| \`${r.fg}\` on \`${r.bg}\` | ${r.ratio.toFixed(2)} | ${dark[i].ratio.toFixed(2)} | ${r.minRatio} |`),
      ].join("\n"),
    ].join("\n\n") + "\n"
  );
}
