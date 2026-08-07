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
    date: "2026-08-07",
    tag: "release",
    title: "0.14.1 — the manifest describes children",
    body: "Compound components now declare what nests inside them, and patterns can set aria-* on the elements they compose. The manifest is what agents read, so a prop it cannot describe is a prop that gets guessed.",
  },
  {
    date: "2026-08-07",
    tag: "components",
    title: "0.14.0 — DescriptionList, and patterns that render themselves",
    body: "DescriptionList/DescriptionItem give a detail drawer a real <dl> instead of a hand-rolled grid, and the composition presets became generated JSX rather than prose to copy. Plus IconMoreHorizontal, the ellipsis glyph a row-actions trigger wanted.",
  },
  {
    date: "2026-08-07",
    tag: "release",
    title: "0.13.1 — the documented stylesheet import typechecks",
    body: "import \"@handamade/psi-react/styles\" — what every doc tells you to write — was a TypeScript error for a standard TypeScript + Vite consumer. Found by installing the published packages into a scratch app, not by any in-repo gate. Both the documented and undocumented spellings now typecheck; no runtime change.",
  },
  {
    date: "2026-08-06",
    tag: "release",
    title: "0.13.0 — Tabs",
    body: "Roving keyboard, automatic activation, and a panel that stays associated with its tab. The fifth and last component the pattern catalog declared as a gap.",
  },
  {
    date: "2026-08-06",
    tag: "components",
    title: "0.12.0 — a drawer is a Dialog placement, not a component",
    body: "Dialog gains placement=\"center | inline-start | inline-end\". The inline values pin the panel full-height to that edge; modality, the focus trap, aria-modal, focus restore and the dismissal reasons are identical. Logical, so RTL flips for free — and there is no Drawer to import.",
  },
  {
    date: "2026-08-06",
    tag: "components",
    title: "0.11.0 — Toast",
    body: "Status messaging lands: variants route to the right live region — warning and danger interrupt, everything else waits its turn — a visually-hidden prefix names the severity, and a toast carrying an action gets a longer timer (10s vs 5s) so there's time to reach it. Three new status glyphs come with it.",
  },
  {
    date: "2026-08-06",
    tag: "components",
    title: "0.10.0 — the Table family and Pagination",
    body: "Six compound components on native <table> semantics, controlled-only: sorting and selection are props, and the consumer owns the state. Pagination is standalone — a numbered pager with ellipsis truncation, not a Table feature.",
    link: { label: "Browse the Storybook", href: "/storybook/" },
  },
  {
    date: "2026-08-05",
    tag: "docs",
    title: "0.9.1 — search overview allocates its budget by kind",
    body: "search(\"\") used to fill topics, then patterns, then components until its budget ran out, so a growing pattern catalog was starving components off the end of the list. It now reserves a floor for components and shortens pattern summaries instead, so growth degrades gracefully rather than dropping items.",
  },
  {
    date: "2026-08-05",
    tag: "docs",
    title: "0.9.0 — the machine-readable surface widens",
    body: "The composition catalog reaches 13 patterns, five of them declaring the component they're still blocked on — Table, Pagination, Drawer, Toast, Tabs — so an agent can read the design system's own backlog instead of inferring it. IconButton's aria-label and Input's type union are promoted into the manifest as discoverable, required props.",
  },
  {
    date: "2026-07-31",
    tag: "release",
    title: "0.8.0 — Menu, and shape becomes themeable",
    body: "Menu lands on the native Popover API: the top layer and light dismiss come from the platform, the roving keyboard and dismissal reasons from Psi. And the --psi-control-* family completes — height, padding, gap and font became tokens (D54–D55), then radius (D56). A customer theme can now retune control shape in one line, which Palette + SlotMap could not express before.",
    link: { label: "Browse the Storybook", href: "/storybook/" },
  },
  {
    date: "2026-07-31",
    tag: "release",
    title: "0.7.2 — MIT, declared",
    body: "All three packages had been published with no license field, which npm reads as all-rights-reserved: installable, but not legally reusable — the opposite of the intent. Every package now declares MIT and ships a LICENSE in its own tarball.",
  },
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
