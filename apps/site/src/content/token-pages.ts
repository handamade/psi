export interface TokenPage {
  slug: "color" | "typography" | "display" | "spacing" | "motion" | "layout";
  title: string;
  covers: string[];
}

export const tokenPages: TokenPage[] = [
  { slug: "color", title: "Color", covers: ["tokens"] },
  { slug: "typography", title: "Typography", covers: ["typography"] },
  { slug: "display", title: "Display", covers: ["display"] },
  { slug: "spacing", title: "Spacing", covers: ["scales.space", "scales.size", "scales.radius", "scales.focusRing"] },
  { slug: "motion", title: "Motion", covers: ["scales.motion"] },
  { slug: "layout", title: "Layout", covers: ["scales.layout"] },
];
