/**
 * Measures the D61 operating envelope for the empty-query overview.
 *
 * The envelope is the range of catalog sizes over which `search("")` keeps
 * all three guarantees: every topic present, every pattern present, and at
 * least COMPONENT_FLOOR (8) components. This script sweeps pattern count and
 * reports where the component floor first breaks.
 *
 * The headline finding this script exists to make reproducible: **the
 * envelope is a function of per-pattern cost, not pattern count.** A pattern
 * brief stores its id twice (`id: "pattern:<id>"` and `title: "<id>"`), and
 * neither copy is subject to the derived intro cap — so the synthetic id
 * length chosen by the harness moves the measured edge by several patterns.
 * Sweeping one id length alone produces a number that looks authoritative
 * and is not; that is what put "25-28" into an earlier draft of the spec.
 *
 * Synthesis matches __tests__/store.test.ts's `synthesizePatterns` helper:
 * cyclic duplication of the real catalog via `index.patterns[n % len]` with a
 * fresh id, so every synthetic pattern is a realistic brief (real intent,
 * match phrases, parameters, and `blocked`/`gaps` tail) rather than a stub.
 *
 * Usage (from the repo root, Node 24 — see .nvmrc):
 *   pnpm --filter @handamade/psi-mcp exec tsx scripts/measure-overview-envelope.ts
 *
 * Requires `pnpm build` to have produced packages/react/dist and
 * packages/tokens/dist, same as the store tests.
 */
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/index-builder.js";
import { createStore } from "../src/store.js";
import type { PsiIndex } from "../src/types.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));

/** Matches store.ts's COMPONENT_FLOOR. Duplicated rather than exported so a
 * change to the constant shows up here as a moved edge, not a silent shift. */
const COMPONENT_FLOOR = 8;
const RESPONSE_BUDGET = 6000;

/** The two id shapes whose disagreement is the whole point of this sweep.
 * `short` is the optimistic case that produced the spec's original 25-28;
 * `realistic` is the conservative one the store test uses and the one whose
 * length is closest to Psi's own pattern ids. */
const ID_STYLES = {
  short: (n: number) => `syn-${n}`,
  realistic: (n: number) => `synthetic-pattern-${n}`,
} as const;

type IdStyle = keyof typeof ID_STYLES;

function synthesize(index: PsiIndex, total: number, style: IdStyle): PsiIndex {
  const extra = Math.max(0, total - index.patterns.length);
  return {
    ...index,
    patterns: [
      ...index.patterns,
      ...Array.from({ length: extra }, (_, n) => ({
        ...index.patterns[n % index.patterns.length],
        id: ID_STYLES[style](n),
      })),
    ],
  };
}

interface Measurement {
  total: number;
  components: number;
  bytes: number;
  allPatterns: boolean;
  allTopics: boolean;
  gapsDisclosed: boolean;
}

function measure(index: PsiIndex, total: number, style: IdStyle): Measurement {
  const grown = synthesize(index, total, style);
  const briefs = createStore(grown).search("");
  const ids = new Set(briefs.map((b) => b.id));
  return {
    total: grown.patterns.length,
    components: briefs.filter((b) => b.kind === "component").length,
    bytes: JSON.stringify(briefs).length,
    allPatterns: grown.patterns.every((p) => ids.has(`pattern:${p.id}`)),
    allTopics: Object.keys(grown.topics).every((name) => ids.has(`topic:${name}`)),
    gapsDisclosed: grown.patterns
      .filter((p) => p.blocked)
      .every((p) =>
        briefs.find((b) => b.id === `pattern:${p.id}`)?.summary.includes("blocked (gaps:"),
      ),
  };
}

const index = await buildIndex({
  tokensDist: `${pkgs}tokens/dist`,
  reactDist: `${pkgs}react/dist`,
  reactDocs: `${pkgs}react/docs`,
  version: "0.0.0-measure",
});

const baseline = index.patterns.length;
const realIdLengths = index.patterns.map((p) => p.id.length);
const avgRealId = realIdLengths.reduce((a, b) => a + b, 0) / realIdLengths.length;

console.log(
  `catalog: ${baseline} patterns, ${Object.keys(index.topics).length} topics, ` +
    `${index.components.length} components in the index`,
);
console.log(
  `real pattern ids: avg ${avgRealId.toFixed(1)} chars ` +
    `(min ${Math.min(...realIdLengths)}, max ${Math.max(...realIdLengths)})`,
);
console.log(
  `synthetic id lengths: short "${ID_STYLES.short(0)}" = ${ID_STYLES.short(0).length}, ` +
    `realistic "${ID_STYLES.realistic(0)}" = ${ID_STYLES.realistic(0).length}\n`,
);

const sizes = Array.from({ length: 39 - baseline + 1 }, (_, i) => baseline + i);
const styles = Object.keys(ID_STYLES) as IdStyle[];

console.log("| total patterns | short ids (components/bytes) | realistic ids (components/bytes) |");
console.log("|---|---|---|");

const edge: Partial<Record<IdStyle, number>> = {};
let anyGuaranteeLost = false;

for (const size of sizes) {
  const cells = styles.map((style) => {
    const m = measure(index, size, style);
    if (m.components < COMPONENT_FLOOR && edge[style] === undefined) edge[style] = size;
    // Patterns, topics and the gaps tail are guaranteed at EVERY size — they
    // are what degrades gracefully. A false here is a real regression, not an
    // envelope boundary, so it is called out rather than tabulated away.
    if (!m.allPatterns || !m.allTopics || !m.gapsDisclosed) {
      anyGuaranteeLost = true;
      console.error(
        `!! ${style} @ ${size}: patterns=${m.allPatterns} topics=${m.allTopics} ` +
          `gaps=${m.gapsDisclosed}`,
      );
    }
    if (m.bytes > RESPONSE_BUDGET) {
      anyGuaranteeLost = true;
      console.error(`!! ${style} @ ${size}: ${m.bytes} bytes exceeds the ${RESPONSE_BUDGET} budget`);
    }
    const floor = m.components >= COMPONENT_FLOOR ? "**" : "";
    return `${floor}${m.components}${floor} / ${m.bytes}`;
  });
  console.log(`| ${size} | ${cells[0]} | ${cells[1]} |`);
}

console.log(
  `\nfloor (>= ${COMPONENT_FLOOR} components) first breaks at: ` +
    styles.map((s) => `${s} ids = ${edge[s] ?? "never in range"}`).join(", "),
);
console.log(
  `last size holding the floor: ` +
    styles.map((s) => `${s} = ${(edge[s] ?? sizes.at(-1)! + 1) - 1}`).join(", "),
);
console.log(
  anyGuaranteeLost
    ? "\nWARNING: a pattern/topic/gaps/budget guarantee failed above — that is a regression."
    : "\nAll sizes kept every topic, every pattern, every gaps tail, and the byte budget.",
);
