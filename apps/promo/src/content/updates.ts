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
    date: "2026-07-08",
    tag: "site",
    title: "The design system gets a public home",
    body: "This website — built with DS itself — plus the full Storybook, published side by side. The page you are reading is a consumer app of @handamade/tokens and @handamade/react.",
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
