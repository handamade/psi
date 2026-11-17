import type { ComponentType } from "react";

const modules = import.meta.glob<{ default: ComponentType }>("../../../../packages/docs/examples/*/*.tsx", { eager: true });
const sources = import.meta.glob<string>("../../../../packages/docs/examples/*/*.tsx", {
  eager: true,
  query: "?raw",
  import: "default",
});

export interface ExampleEntry {
  slug: string;
  name: string;
  Component: ComponentType;
  source: string;
}

export const examples: ExampleEntry[] = Object.entries(modules)
  .map(([path, mod]) => {
    const [, slug, file] = path.match(/\/examples\/([^/]+)\/([^/]+)\.tsx$/)!;
    return { slug, name: file, Component: mod.default, source: sources[path] };
  })
  .sort((a, b) => `${a.slug}/${a.name}`.localeCompare(`${b.slug}/${b.name}`));

export function examplesFor(slug: string): ExampleEntry[] {
  return examples.filter((e) => e.slug === slug);
}

/** Examples that bring their own landmarks (`<main>`, `<header>`). Inline in a docs
 * page they would nest inside the page's `<main>`, so the Preview frames them. */
export const FRAMED = new Set(["app-shell/basic"]);

export function isFramed(slug: string, name: string): boolean {
  return FRAMED.has(`${slug}/${name}`);
}
