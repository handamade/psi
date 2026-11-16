import { getCollection } from "astro:content";

import { componentPages } from "../content/component-pages";
import { GUIDE_ORDER } from "../content/docs-nav";
import { tokenPages } from "../content/token-pages";
import { getExport, summary } from "./components";

export interface TwinEntry {
  url: string;
  title: string;
  summary: string;
}

/** Every docs page's markdown twin, in nav order. Lives apart from
 * markdown.ts because `astro:content` does not exist under Vitest. */
export async function allTwins(): Promise<TwinEntry[]> {
  const guides = await getCollection("guides");
  const byId = new Map(guides.map((g) => [g.id, g]));
  return [
    { url: "/docs/index.md", title: "Docs overview", summary: "Where to start, and what is here." },
    ...GUIDE_ORDER.map((id) => {
      const g = byId.get(id)!;
      return { url: `/docs/get-started/${id}.md`, title: g.data.title, summary: g.data.description };
    }),
    ...componentPages.map((p) => ({
      url: `/docs/components/${p.slug}.md`,
      title: p.title,
      summary: summary(getExport(p.members[0]).description),
    })),
    ...tokenPages.map((p) => ({
      url: `/docs/tokens/${p.slug}.md`,
      title: `${p.title} tokens`,
      summary: `Psi's ${p.title.toLowerCase()} tokens with values in every theme.`,
    })),
  ];
}
