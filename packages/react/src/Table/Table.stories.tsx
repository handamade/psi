import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Table } from "./Table.js";
import { TableHead } from "./TableHead.js";
import { TableBody } from "./TableBody.js";
import { TableRow } from "./TableRow.js";
import { TableCell } from "./TableCell.js";
import { TableHeaderCell } from "./TableHeaderCell.js";
import type { TableSortState } from "./Table.js";

const meta: Meta<typeof Table> = { title: "Data/Table", component: Table };
export default meta;
type Story = StoryObj<typeof Table>;

const ROWS = [
  { id: "t1", date: "2026-08-05", payee: "Acme Corp", amount: "1,240.00" },
  { id: "t2", date: "2026-08-06", payee: "Globex", amount: "98.50" },
  { id: "t3", date: "2026-08-07", payee: "Initech", amount: "12,004.25" },
];

function Demo({ size, stickyHeader }: { size?: 32 | 40 | 48; stickyHeader?: boolean }) {
  const [sort, setSort] = React.useState<TableSortState | null>({ key: "date", direction: "asc" });
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(new Set(["t2"]));
  return (
    <Table
      size={size}
      stickyHeader={stickyHeader}
      sortable
      selectable
      sort={sort}
      onSortChange={setSort}
      selected={selected}
      onSelectionChange={setSelected}
    >
      <TableHead>
        <TableRow>
          <TableHeaderCell sortKey="date">Date</TableHeaderCell>
          <TableHeaderCell sortKey="payee">Payee</TableHeaderCell>
          <TableHeaderCell sortKey="amount" numeric>Amount</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {ROWS.map((r) => (
          <TableRow key={r.id} rowId={r.id} selectLabel={`Select ${r.date} ${r.payee}`}>
            <TableCell>{r.date}</TableCell>
            <TableCell>{r.payee}</TableCell>
            <TableCell numeric>{r.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export const Size32: Story = { render: () => <Demo size={32} /> };
export const Size40: Story = { render: () => <Demo size={40} /> };
export const Size48: Story = { render: () => <Demo size={48} /> };
export const Sticky: Story = { render: () => <Demo stickyHeader /> };
export const Empty: Story = {
  render: () => (
    <Table>
      <TableHead><TableRow><TableHeaderCell>Date</TableHeaderCell><TableHeaderCell numeric>Amount</TableHeaderCell></TableRow></TableHead>
      <TableBody />
    </Table>
  ),
};
