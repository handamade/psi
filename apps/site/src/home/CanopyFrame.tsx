import { canopy } from "../examples/canopy";

/** Canopy on its own page, for the homepage's iframe. */
export function CanopyFrame() {
  const { Component } = canopy;
  return <Component />;
}
