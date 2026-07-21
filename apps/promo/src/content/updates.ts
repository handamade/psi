/**
 * The website's update feed — the "CMS" for the Updates section.
 * Add new entries at the TOP. Dates are ISO (YYYY-MM-DD).
 * Curated announcements, not a changelog mirror: write an entry when a
 * change is worth telling the outside world about.
 */
export interface UpdateEntry {
  date: string;
  tag: "release" | "components" | "tokens" | "docs" | "site";
  title: string;
  body: string;
  /** Optional link — absolute URL or same-origin path (e.g. a Storybook docs page). */
  link?: { label: string; href: string };
}

export const UPDATES: UpdateEntry[] = [
  {
    date: "2026-07-21",
    tag: "release",
    title: "0.7.0 — Panel, Toolbar, and the surface family",
    body: "The shared --psi-surface-* recipe lands as tokens plus a Panel primitive (Dialog rebinds, zero visual change). Toolbar unblocks the filter-toolbar pattern — all three patterns are now live. This site's panels are the first Panel consumer.",
  },
  {
    date: "2026-07-20",
    tag: "release",
    title: "0.6.0 — composition contracts complete",
    body: "Token scopes (D46) now gate every binding at build time; three composition patterns with clarifying parameters (D47) ship in patterns.json; the D48 validator runs in every build.",
  },
  {
    date: "2026-07-19",
    tag: "release",
    title: "Psi 0.5.0 — Field, Dialog, and slot contracts",
    body: "The two components agents asked for most: Field wraps any labeled control and wires ids, aria-describedby and error state automatically; Dialog is a modal on the native top layer — focus trap and aria-modal from the platform. And the first slot contracts ship: the manifest now says what nests where, validated at build.",
    link: { label: "Browse the Storybook", href: "/storybook/" },
  },
  {
    date: "2026-07-19",
    tag: "docs",
    title: "0.4.1 — the agent surface, sharpened",
    body: "A day-one consumer build found the gaps, so we fixed them the same day: the required component-CSS import is now documented everywhere, every component carries a one-line description, and the MCP index answers theme and spacing-scale questions it couldn't before.",
  },
  {
    date: "2026-07-18",
    tag: "release",
    title: "Psi 0.4.0 — the system, queryable",
    body: "@handamade/psi-mcp lands: a hosted MCP server (psi.kurkin.de/mcp) plus a local stdio mode, exposing components, tokens and guidance as search/get tools. npx @handamade/psi-mcp init writes the agent guide straight into your repo.",
  },
  {
    date: "2026-07-18",
    tag: "release",
    title: "The system has a name: Psi (Ψ)",
    body: "0.3.0 renames everything — @handamade/psi-tokens and @handamade/psi-react on npm, --psi-* custom properties, data-psi-theme. Breaking, but a one-pass find-and-replace; the migration is documented in the changelog.",
  },
  {
    date: "2026-07-08",
    tag: "site",
    title: "The design system gets a public home",
    body: "This website — built with Psi itself — plus the full Storybook, published side by side. The page you are reading is a consumer app of @handamade/psi-tokens and @handamade/psi-react.",
    link: { label: "Browse the Storybook", href: "/storybook/" },
  },
  {
    date: "2026-07-06",
    tag: "docs",
    title: "AI-readable across the board",
    body: "Every package now ships llms.txt, a full prop manifest, usage guidance and DTCG token exports — point an agent at the repo and it knows the system.",
  },
  {
    date: "2026-07-04",
    tag: "components",
    title: "Generated component docs land in Storybook",
    body: "Per-component markdown docs are now emitted straight from the TypeScript source — props, theming tokens and usage rules stay in lockstep with code.",
  },
];
