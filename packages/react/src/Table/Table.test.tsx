import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Table } from "./Table.js";
import { TableHead } from "./TableHead.js";
import { TableBody } from "./TableBody.js";
import { TableRow } from "./TableRow.js";
import { TableCell } from "./TableCell.js";
import { TableHeaderCell } from "./TableHeaderCell.js";

function basic() {
  return render(
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell numeric>Amount</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow rowId="t1">
          <TableCell>2026-08-05</TableCell>
          <TableCell numeric>1,240.00</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
}

describe("Table", () => {
  it("renders native table semantics", () => {
    basic();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getAllByRole("cell")).toHaveLength(2);
  });

  it("marks numeric cells with a data attribute", () => {
    const { container } = basic();
    const numeric = container.querySelectorAll("[data-numeric]");
    expect(numeric).toHaveLength(2); // one header, one body cell
  });

  it("defaults to size 40 and reflects it on the table element", () => {
    const { container } = basic();
    expect(container.querySelector("table")?.getAttribute("data-size")).toBe("40");
  });

  it("accepts an explicit size", () => {
    const { container } = render(
      <Table size={32}>
        <TableBody>
          <TableRow><TableCell>x</TableCell></TableRow>
        </TableBody>
      </Table>,
    );
    expect(container.querySelector("table")?.getAttribute("data-size")).toBe("32");
  });

  it("applies the sticky class only when stickyHeader is set", () => {
    const { container: plain } = render(
      <Table><TableBody><TableRow><TableCell>a</TableCell></TableRow></TableBody></Table>,
    );
    const { container: sticky } = render(
      <Table stickyHeader><TableBody><TableRow><TableCell>a</TableCell></TableRow></TableBody></Table>,
    );
    const plainCls = plain.querySelector("table")!.className;
    const stickyCls = sticky.querySelector("table")!.className;
    expect(stickyCls).not.toBe(plainCls);
  });
});
