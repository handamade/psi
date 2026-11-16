import { componentPages } from "./component-pages";

export interface NavLink {
  label: string;
  href: string;
}
export interface NavSection {
  label: string;
  links: NavLink[];
}

export const docsNav: NavSection[] = [
  { label: "Get started", links: [{ label: "Overview", href: "/docs/" }] },
  {
    label: "Components",
    links: componentPages.map((p) => ({ label: p.title, href: `/docs/components/${p.slug}/` })),
  },
  { label: "Tokens", links: [] },
];
