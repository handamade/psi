import { useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@handamade/psi-react";
import type { TableSortState } from "@handamade/psi-react";

const rows = [
  { id: "a", name: "Aurora", seats: 12 },
  { id: "b", name: "Birch", seats: 4 },
  { id: "c", name: "Cedar", seats: 27 },
];

export default function TableBasic() {
  const [sort, setSort] = useState<TableSortState | null>({ key: "name", direction: "asc" });
  const sorted = [...rows].sort((a, b) => {
    const order = sort?.key === "seats" ? a.seats - b.seats : a.name.localeCompare(b.name);
    return sort?.direction === "desc" ? -order : order;
  });
  return (
    <Table sortable sort={sort} onSortChange={setSort}>
      <TableCaption>Workspaces</TableCaption>
      <TableHead>
        <TableRow>
          <TableHeaderCell sortKey="name">Name</TableHeaderCell>
          <TableHeaderCell sortKey="seats" numeric>
            Seats
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.id}>
            <TableCell rowHeader>{row.name}</TableCell>
            <TableCell numeric>{row.seats}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
