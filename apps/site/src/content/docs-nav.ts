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
  { label: "Components", links: [] },
  { label: "Tokens", links: [] },
];
