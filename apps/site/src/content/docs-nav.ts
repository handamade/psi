import { componentPages } from "./component-pages";
import { tokenPages } from "./token-pages";

export interface NavLink {
  label: string;
  href: string;
}
export interface NavSection {
  label: string;
  links: NavLink[];
}

export const GUIDE_ORDER = ["installation", "theming", "dark-mode", "ai", "sizes-and-variants"] as const;
const GUIDE_LABELS: Record<(typeof GUIDE_ORDER)[number], string> = {
  installation: "Installation",
  theming: "Theming",
  "dark-mode": "Dark mode",
  ai: "Using Psi with AI",
  "sizes-and-variants": "Sizes and variants",
};

export const docsNav: NavSection[] = [
  {
    label: "Get started",
    links: [
      { label: "Overview", href: "/docs/" },
      ...GUIDE_ORDER.map((id) => ({ label: GUIDE_LABELS[id], href: `/docs/get-started/${id}/` })),
    ],
  },
  {
    label: "Components",
    links: componentPages.map((p) => ({ label: p.title, href: `/docs/components/${p.slug}/` })),
  },
  {
    label: "Tokens",
    links: tokenPages.map((p) => ({ label: p.title, href: `/docs/tokens/${p.slug}/` })),
  },
];
