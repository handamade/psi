import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table } from "./Table.js";
import { TableHead } from "./TableHead.js";
import { TableBody } from "./TableBody.js";
import { TableRow } from "./TableRow.js";
import { TableCell } from "./TableCell.js";
import { TableHeaderCell } from "./TableHeaderCell.js";

function selectable(selected: ReadonlySet<string>, onSelectionChange = vi.fn()) {
  const utils = render(
    <Table selectable selected={selected} onSelectionChange={onSelectionChange}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Date</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow rowId="t1" selectLabel="Select 2026-08-05 Acme"><TableCell>a</TableCell></TableRow>
        <TableRow rowId="t2" selectLabel="Select 2026-08-06 Globex"><TableCell>b</TableCell></TableRow>
      </TableBody>
    </Table>,
  );
  return { ...utils, onSelectionChange };
}

describe("Table selection", () => {
  it("names each row checkbox from selectLabel", () => {
    selectable(new Set());
    expect(screen.getByRole("checkbox", { name: "Select 2026-08-05 Acme" })).toBeTruthy();
  });

  it("checks the rows in the selected set", () => {
    selectable(new Set(["t2"]));
    expect((screen.getByRole("checkbox", { name: "Select 2026-08-06 Globex" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Select 2026-08-05 Acme" }) as HTMLInputElement).checked).toBe(false);
  });

  it("adds a row to the selection", async () => {
    const { onSelectionChange } = selectable(new Set(["t1"]));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select 2026-08-06 Globex" }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["t1", "t2"]));
  });

  it("removes a row from the selection", async () => {
    const { onSelectionChange } = selectable(new Set(["t1", "t2"]));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select 2026-08-05 Acme" }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["t2"]));
  });

  it("marks select-all indeterminate on a partial selection", () => {
    selectable(new Set(["t1"]));
    const all = screen.getByRole("checkbox", { name: "Select all rows" }) as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    expect(all.checked).toBe(false);
  });

  it("checks select-all when every row is selected, without indeterminate", () => {
    selectable(new Set(["t1", "t2"]));
    const all = screen.getByRole("checkbox", { name: "Select all rows" }) as HTMLInputElement;
    expect(all.checked).toBe(true);
    expect(all.indeterminate).toBe(false);
  });

  it("select-all selects every row", async () => {
    const { onSelectionChange } = selectable(new Set());
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["t1", "t2"]));
  });

  it("select-all clears when already fully selected", async () => {
    const { onSelectionChange } = selectable(new Set(["t1", "t2"]));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it("renders no checkbox column when the table is not selectable", () => {
    render(
      <Table>
        <TableBody><TableRow rowId="t1"><TableCell>a</TableCell></TableRow></TableBody>
      </Table>,
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
