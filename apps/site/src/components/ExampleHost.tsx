import { examples } from "../examples/registry";

/** Renders one registry example on its own, for the framed-preview page.
 * An Astro island needs a static import, so it goes through the registry. */
export function ExampleHost({ slug, name }: { slug: string; name: string }) {
  const entry = examples.find((e) => e.slug === slug && e.name === name);
  if (!entry) throw new Error(`No example ${slug}/${name}`);
  const { Component } = entry;
  return <Component />;
}
