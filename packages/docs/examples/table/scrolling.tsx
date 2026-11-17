import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@handamade/psi-react";

const rows = Array.from({ length: 12 }, (_, i) => ({
  id: `r${i + 1}`,
  date: `2026-08-${String(i + 1).padStart(2, "0")}`,
  workspace: ["Aurora", "Birch", "Cedar"][i % 3],
  region: ["eu-central", "us-east", "ap-south"][i % 3],
  seats: 4 + i * 3,
}));

export default function TableScrolling() {
  return (
    <TableContainer maxBlockSize={280}>
      <Table stickyHeader size={32}>
        <TableCaption>Seat changes</TableCaption>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Workspace</TableHeaderCell>
            <TableHeaderCell>Region</TableHeaderCell>
            <TableHeaderCell numeric>Seats</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.date}</TableCell>
              <TableCell>{r.workspace}</TableCell>
              <TableCell>{r.region}</TableCell>
              <TableCell numeric>{r.seats}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
