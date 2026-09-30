import { describe, it, expect } from "vitest";
import { createRef } from "react";
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

  describe("pass-through (D85)", () => {
    it("puts remaining attributes on every member's element", () => {
      render(
        <Table aria-label="Applications" aria-busy="true" data-testid="table">
          <TableHead id="head" data-testid="head">
            <TableRow data-testid="head-row">
              <TableHeaderCell data-testid="th" abbr="Amt">Amount</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody aria-busy="true" data-testid="body">
            <TableRow rowId="r1" id="row-1" data-testid="row">
              <TableCell data-testid="td" title="Exact amount">1,240.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(screen.getByTestId("table")).toHaveAttribute("aria-label", "Applications");
      expect(screen.getByTestId("table")).toHaveAttribute("aria-busy", "true");
      expect(screen.getByTestId("head")).toHaveAttribute("id", "head");
      expect(screen.getByTestId("head-row").tagName).toBe("TR");
      expect(screen.getByTestId("th")).toHaveAttribute("abbr", "Amt");
      expect(screen.getByTestId("body")).toHaveAttribute("aria-busy", "true");
      expect(screen.getByTestId("row")).toHaveAttribute("id", "row-1");
      expect(screen.getByTestId("td")).toHaveAttribute("title", "Exact amount");
    });

    it("keeps its own attributes over passed ones", () => {
      const hostileTable = { "data-size": "99" } as object;
      const hostileTh = { scope: "row" } as object;
      const hostileRow = { "data-row-id": "x", "data-selected": "true" } as object;
      render(
        <Table size={32} {...hostileTable} data-testid="table">
          <TableHead>
            <TableRow>
              <TableHeaderCell {...hostileTh} data-testid="th">Amount</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow rowId="r1" {...hostileRow} data-testid="row">
              <TableCell numeric data-numeric="no" data-testid="td">1</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(screen.getByTestId("table")).toHaveAttribute("data-size", "32");
      expect(screen.getByTestId("th")).toHaveAttribute("scope", "col");
      expect(screen.getByTestId("row")).toHaveAttribute("data-row-id", "r1");
      expect(screen.getByTestId("row")).not.toHaveAttribute("data-selected");
      expect(screen.getByTestId("td")).toHaveAttribute("data-numeric", "true");
    });

    it("merges className on every member", () => {
      render(
        <Table className="t" data-testid="table">
          <TableBody className="b" data-testid="body">
            <TableRow className="r" data-testid="row">
              <TableCell className="c" data-testid="td">1</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      for (const [id, own] of [["table", "t"], ["body", "b"], ["row", "r"], ["td", "c"]] as const) {
        const cls = screen.getByTestId(id).className.split(" ");
        expect(cls).toContain(own);
        expect(cls.length).toBeGreaterThan(1);
      }
    });

    it("forwards a ref from every member", () => {
      const head = createRef<HTMLTableSectionElement>();
      const body = createRef<HTMLTableSectionElement>();
      const row = createRef<HTMLTableRowElement>();
      const th = createRef<HTMLTableCellElement>();
      const td = createRef<HTMLTableCellElement>();
      render(
        <Table>
          <TableHead ref={head}>
            <TableRow>
              <TableHeaderCell ref={th}>Amount</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody ref={body}>
            <TableRow ref={row}>
              <TableCell ref={td}>1</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(head.current?.tagName).toBe("THEAD");
      expect(body.current?.tagName).toBe("TBODY");
      expect(row.current?.tagName).toBe("TR");
      expect(th.current?.tagName).toBe("TH");
      expect(td.current?.tagName).toBe("TD");
    });
  });

  describe("colSpan and row headers (D85)", () => {
    it("spans a cell across columns", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} data-testid="empty">No applications match.</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(screen.getByTestId("empty")).toHaveAttribute("colspan", "4");
    });

    it("renders a row header as th[scope=row] with the cell's styling", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell rowHeader data-testid="rh">APP-1042</TableCell>
              <TableCell data-testid="td">Pending</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      const rh = screen.getByTestId("rh");
      expect(rh.tagName).toBe("TH");
      expect(rh).toHaveAttribute("scope", "row");
      expect(screen.getByRole("rowheader", { name: "APP-1042" })).toBe(rh);
      const cellClass = screen.getByTestId("td").className.split(" ")[0];
      expect(rh.className.split(" ")).toContain(cellClass);
    });
  });
});
