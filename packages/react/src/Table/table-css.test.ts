import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(import.meta.dirname, "table.module.css"), "utf8");
/** The declarations of the first rule whose selector list is exactly `selector`. */
const rule = (selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, "m").exec(css)?.[1] ?? "";
};

describe("table.module.css (D126)", () => {
  it("uses the separate border model, so the border follows the radius", () => {
    const table = rule(".table");
    expect(table).toMatch(/border-collapse:\s*separate/);
    expect(table).toMatch(/border-spacing:\s*0/);
    expect(table).toMatch(/border-radius:\s*var\(--psi-table-radius\)/);
    expect(table).toMatch(/--_psi-table-corner:\s*calc\(var\(--psi-table-radius\)\s*-\s*1px\)/);
    expect(css).not.toMatch(/border-collapse:\s*collapse/);
  });

  it("drops the bottom border where it would double the table's own", () => {
    expect(rule(".body .row:last-child > *")).toMatch(/border-bottom:\s*0/);
    expect(rule(".table:not(:has(.body .row)) .head .row:last-child > *")).toMatch(/border-bottom:\s*0/);
  });

  it("rounds the four corner cells with the inner radius", () => {
    expect(css).toMatch(/border-start-start-radius:\s*var\(--_psi-table-corner\)/);
    expect(css).toMatch(/border-start-end-radius:\s*var\(--_psi-table-corner\)/);
    expect(css).toMatch(/border-end-start-radius:\s*var\(--_psi-table-corner\)/);
    expect(css).toMatch(/border-end-end-radius:\s*var\(--_psi-table-corner\)/);
  });

  it("paints row states on the cells, not the tr", () => {
    expect(rule(".row > *")).toMatch(/background:\s*var\(--psi-table-row-bg\)/);
    expect(rule(".body .row:hover > *")).toMatch(/var\(--psi-table-row-bg-hover\)/);
    expect(rule(".row[data-selected] > *")).toMatch(/var\(--psi-table-row-bg-selected\)/);
    expect(rule(".body .row[data-selected]:hover > *")).toMatch(/var\(--psi-table-row-bg-selected\)/);
    expect(rule(".row")).toBe("");
  });

  it("draws the sticky header's edge with its border, not a box-shadow", () => {
    expect(rule(".sticky .headerCell")).toMatch(/position:\s*sticky/);
    expect(css).not.toMatch(/box-shadow/);
  });

  it("moves the frame to the container and zeroes the table's own", () => {
    const container = rule(".container");
    expect(container).toMatch(/overflow:\s*auto/);
    expect(container).toMatch(/border:\s*1px solid var\(--psi-table-border\)/);
    expect(container).toMatch(/border-radius:\s*var\(--psi-table-radius\)/);
    const inner = rule(".container > .table");
    expect(inner).toMatch(/border:\s*0/);
    expect(inner).toMatch(/--_psi-table-corner:\s*0px/);
  });

  it("keeps a numeric body cell on one line", () => {
    expect(rule(".cell[data-numeric]")).toMatch(/white-space:\s*nowrap/);
  });
});
