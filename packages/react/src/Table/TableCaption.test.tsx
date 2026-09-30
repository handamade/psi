import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Table } from "./Table.js";
import { TableBody } from "./TableBody.js";
import { TableRow } from "./TableRow.js";
import { TableCell } from "./TableCell.js";
import { TableCaption } from "./TableCaption.js";

describe("TableCaption (D85)", () => {
  it("renders a <caption> as the table's first child, with a detail line", () => {
    render(
      <Table data-testid="table">
        <TableCaption detail="Rows 51–100 of more than 100,000">Applications</TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>APP-1042</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const table = screen.getByTestId("table");
    const caption = table.firstElementChild!;
    expect(caption.tagName).toBe("CAPTION");
    expect(caption).toHaveTextContent("Applications");
    expect(caption).toHaveTextContent("Rows 51–100 of more than 100,000");
    expect(screen.getByRole("table", { name: /Applications/ })).toBe(table);
  });

  it("can take focus through a ref, for a page change to announce the range", () => {
    const ref = createRef<HTMLTableCaptionElement>();
    render(
      <Table>
        <TableCaption ref={ref} tabIndex={-1} data-testid="caption">
          Applications
        </TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(ref.current?.tagName).toBe("CAPTION");
    ref.current!.focus();
    expect(screen.getByTestId("caption")).toHaveFocus();
  });

  it("merges className and passes attributes through", () => {
    render(
      <Table>
        <TableCaption className="mine" id="cap" data-testid="caption">
          Applications
        </TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const caption = screen.getByTestId("caption");
    expect(caption).toHaveAttribute("id", "cap");
    expect(caption.className.split(" ")).toContain("mine");
    expect(caption.className.split(" ").length).toBeGreaterThan(1);
  });
});
