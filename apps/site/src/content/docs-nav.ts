import { GUIDE_LABELS, GUIDE_ORDER, componentPages, tokenPages } from "@handamade/psi-docs";

export { GUIDE_ORDER };

export interface NavLink {
  label: string;
  href: string;
}
export interface NavSection {
  label: string;
  links: NavLink[];
}

export const docsNav: NavSection[] = [
  {
    label: "Get started",
    links: [
      { label: "Overview", href: "/docs/" },
      ...GUIDE_ORDER.map((id) => ({ label: GUIDE_LABELS[id], href: `/docs/get-started/${id}/` })),
      { label: "Changelog", href: "/docs/changelog/" },
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
