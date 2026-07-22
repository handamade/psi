// D46 — token scope vocabulary. Scope entries on a token are either a
// property-group name (key of PROPERTY_GROUPS) or a concrete CSS property
// listed in one of the groups. The -bg/-fg/-border suffix convention on
// component-token keys is normative: SUFFIX_GROUPS is the shipped map.

// ── Property groups ──────────────────────────────────────────────────

export const PROPERTY_GROUPS: Record<string, readonly string[]> = {
  text: ["color", "fill", "stroke", "caret-color", "text-decoration-color"],
  surface: ["background", "background-color", "accent-color"],
  border: [
    "border", "border-color", "border-top-color", "border-right-color",
    "border-bottom-color", "border-left-color", "outline", "outline-color",
    "box-shadow",
    "border-top", "border-right", "border-bottom", "border-left",
    "border-inline", "border-block",
  ],
  gap: [
    "gap", "row-gap", "column-gap",
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "padding-inline", "padding-block",
    "padding-inline-start", "padding-inline-end", "padding-block-start", "padding-block-end",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "margin-inline", "margin-block",
    "margin-inline-start", "margin-inline-end", "margin-block-start", "margin-block-end",
    "inset", "top", "right", "bottom", "left",
    "scroll-margin", "scroll-padding", "translate",
    // edge-distance uses: icon offsets (background-position) and viewport-inset sizing (max-width in calc) are gap-family intent
    "background-position", "max-width",
  ],
};

// ── Normative suffix groups ──────────────────────────────────────────

// Normative component-token suffix → property group (D46).
export const SUFFIX_GROUPS: Record<string, string> = {
  fg: "text",
  bg: "surface",
  border: "border",
};

// ── Scale scopes ─────────────────────────────────────────────────────

// Scale-family scopes (D46 "gaps" family). Families not listed are unscoped.
export const SCALE_SCOPES: Record<string, readonly string[]> = {
  space: ["gap"],
};

// ── Internal lookup ──────────────────────────────────────────────────

const KNOWN_PROPERTIES = new Set(Object.values(PROPERTY_GROUPS).flat());

// ── Query functions ─────────────────────────────────────────────────

export function isKnownScopeEntry(entry: string): boolean {
  return entry in PROPERTY_GROUPS || KNOWN_PROPERTIES.has(entry);
}

// Expand scope entries (group names or property names) to a deduped
// property list. Throws on unknown entries (D48 posture).
export function expandScopes(scopes: readonly string[]): readonly string[] {
  const out = new Set<string>();
  for (const entry of scopes) {
    if (entry in PROPERTY_GROUPS) {
      for (const p of PROPERTY_GROUPS[entry]) out.add(p);
    } else if (KNOWN_PROPERTIES.has(entry)) {
      out.add(entry);
    } else {
      throw new Error(`unknown scope entry "${entry}" — not a known CSS property or declared group`);
    }
  }
  return [...out];
}

// Property group a component-token key declares via its last bg/fg/border
// segment ("accent-bg-hover" → surface). Undefined for unsuffixed keys
// ("focus-ring", "radius", "backdrop") — those are not scope-checked.
export function keyGroup(key: string): string | undefined {
  const segments = key.split("-");
  for (let i = segments.length - 1; i >= 0; i--) {
    const group = SUFFIX_GROUPS[segments[i]];
    if (group) return group;
  }
  return undefined;
}
