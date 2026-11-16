import type { ComponentType } from "react";

const modules = import.meta.glob<{ default: ComponentType }>("./*/*.tsx", { eager: true });
const sources = import.meta.glob<string>("./*/*.tsx", { eager: true, query: "?raw", import: "default" });

export interface ExampleEntry {
  slug: string;
  name: string;
  Component: ComponentType;
  source: string;
}

export const examples: ExampleEntry[] = Object.entries(modules)
  .map(([path, mod]) => {
    const [, slug, file] = path.match(/^\.\/([^/]+)\/([^/]+)\.tsx$/)!;
    return { slug, name: file, Component: mod.default, source: sources[path] };
  })
  .sort((a, b) => `${a.slug}/${a.name}`.localeCompare(`${b.slug}/${b.name}`));

export function examplesFor(slug: string): ExampleEntry[] {
  return examples.filter((e) => e.slug === slug);
}
