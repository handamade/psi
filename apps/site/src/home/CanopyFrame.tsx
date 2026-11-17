import { canopy } from "../examples/registry";

/** Canopy on its own page, for the homepage's iframe. An island needs a static
 * import, so it goes through the registry like ExampleHost does. */
export function CanopyFrame() {
  const { Component } = canopy;
  return <Component />;
}
