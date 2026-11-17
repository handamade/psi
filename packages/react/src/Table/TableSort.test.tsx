import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table } from "./Table.js";
import { TableHead } from "./TableHead.js";
import { TableBody } from "./TableBody.js";
import { TableRow } from "./TableRow.js";
import { TableCell } from "./TableCell.js";
import { TableHeaderCell } from "./TableHeaderCell.js";
import type { TableSortState } from "./Table.js";

function sortable(sort: TableSortState | null, onSortChange = vi.fn()) {
  const utils = render(
    <Table sortable sort={sort} onSortChange={onSortChange}>
      <TableHead>
        <TableRow>
          <TableHeaderCell sortKey="date">Date</TableHeaderCell>
          <TableHeaderCell sortKey="amount" numeric>Amount</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow rowId="t1"><TableCell>a</TableCell><TableCell numeric>1</TableCell><TableCell /></TableRow>
      </TableBody>
    </Table>,
  );
  return { ...utils, onSortChange };
}

describe("Table sorting", () => {
  it("puts aria-sort on the th, not the button", () => {
    sortable({ key: "date", direction: "asc" });
    const header = screen.getByRole("columnheader", { name: /Date/ });
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    expect(header.querySelector("button")?.hasAttribute("aria-sort")).toBe(false);
  });

  it("reports descending for a desc sort", () => {
    sortable({ key: "date", direction: "desc" });
    expect(screen.getByRole("columnheader", { name: /Date/ }).getAttribute("aria-sort")).toBe("descending");
  });

  it("reports none on sortable columns that are not the active sort", () => {
    sortable({ key: "date", direction: "asc" });
    expect(screen.getByRole("columnheader", { name: /Amount/ }).getAttribute("aria-sort")).toBe("none");
  });

  it("omits aria-sort entirely on a column with no sortKey", () => {
    sortable({ key: "date", direction: "asc" });
    expect(screen.getByRole("columnheader", { name: "Actions" }).hasAttribute("aria-sort")).toBe(false);
  });

  it("emits asc when an unsorted column is activated", async () => {
    const { onSortChange } = sortable({ key: "date", direction: "asc" });
    await userEvent.click(screen.getByRole("button", { name: /Amount/ }));
    expect(onSortChange).toHaveBeenCalledWith({ key: "amount", direction: "asc" });
  });

  it("toggles direction when the active column is activated again", async () => {
    const { onSortChange } = sortable({ key: "date", direction: "asc" });
    await userEvent.click(screen.getByRole("button", { name: /Date/ }));
    expect(onSortChange).toHaveBeenCalledWith({ key: "date", direction: "desc" });
  });

  it("toggles a descending column back to ascending", async () => {
    const { onSortChange } = sortable({ key: "date", direction: "desc" });
    await userEvent.click(screen.getByRole("button", { name: /Date/ }));
    expect(onSortChange).toHaveBeenCalledWith({ key: "date", direction: "asc" });
  });

  it("renders no sort button when the table is not sortable", () => {
    render(
      <Table>
        <TableHead><TableRow><TableHeaderCell sortKey="date">Date</TableHeaderCell></TableRow></TableHead>
        <TableBody><TableRow><TableCell>a</TableCell></TableRow></TableBody>
      </Table>,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows a two-way mark on a sortable column that is not sorted (D126)", () => {
    sortable({ key: "date", direction: "asc" });
    const mark = screen.getByRole("columnheader", { name: /Amount/ }).querySelector("[data-mark]");
    expect(mark?.getAttribute("data-mark")).toBe("both");
    expect(mark?.hasAttribute("data-active")).toBe(false);
    expect(mark?.getAttribute("aria-hidden")).toBe("true");
    expect(mark?.querySelector("svg")).not.toBeNull();
  });

  it("shows an up arrow on an ascending column and a down arrow on a descending one", () => {
    const { unmount } = sortable({ key: "date", direction: "asc" });
    let mark = screen.getByRole("columnheader", { name: /Date/ }).querySelector("[data-mark]");
    expect(mark?.getAttribute("data-mark")).toBe("asc");
    expect(mark?.hasAttribute("data-active")).toBe(true);
    unmount();
    sortable({ key: "date", direction: "desc" });
    mark = screen.getByRole("columnheader", { name: /Date/ }).querySelector("[data-mark]");
    expect(mark?.getAttribute("data-mark")).toBe("desc");
  });

  it("keeps the mark out of the header's accessible name", () => {
    sortable(null);
    expect(screen.getByRole("button", { name: "Amount" })).toBeTruthy();
  });

  it("draws no mark on a column without a sortKey", () => {
    sortable(null);
    expect(screen.getByRole("columnheader", { name: "Actions" }).querySelector("[data-mark]")).toBeNull();
  });
});
