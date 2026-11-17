import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Table } from "./Table.js";
import { TableHead } from "./TableHead.js";
import { TableBody } from "./TableBody.js";
import { TableRow } from "./TableRow.js";
import { TableCell } from "./TableCell.js";
import { TableHeaderCell } from "./TableHeaderCell.js";
import { TableCaption } from "./TableCaption.js";
import { TableContainer } from "./TableContainer.js";
import type { TableSortState } from "./Table.js";

const meta: Meta<typeof Table> = { title: "Data/Table", component: Table };
export default meta;
type Story = StoryObj<typeof Table>;

const ROWS = [
  { id: "t1", date: "2026-08-05", payee: "Acme Corp", amount: "1,240.00" },
  { id: "t2", date: "2026-08-06", payee: "Globex", amount: "98.50" },
  { id: "t3", date: "2026-08-07", payee: "Initech", amount: "12,004.25" },
];

const PAYEES = ["Acme Corp", "Globex", "Initech", "Umbrella Holdings", "Stark Industries"];
const CATEGORIES = ["Software", "Travel", "Office supplies", "Consulting", "Hardware"];
/** 20 rows, enough to scroll a 240px region. Fixed strings: no locale formatting in a baseline. */
const MANY = Array.from({ length: 20 }, (_, i) => ({
  id: `m${i + 1}`,
  date: `2026-08-${String(i + 1).padStart(2, "0")}`,
  payee: PAYEES[i % PAYEES.length],
  category: CATEGORIES[i % CATEGORIES.length],
  reference: `INV-2026-${String(4100 + i * 7)}`,
  amount: `${(i * 1371 + 98).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.50`,
}));

/** Scrolls an element once on mount, so a baseline shows the scrolled state. */
function useScrolledTo(top: number, left = 0) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = top;
    ref.current.scrollLeft = left;
  }, [top, left]);
  return ref;
}

function ManyRows({ wide }: { wide?: boolean }) {
  const nowrap = wide ? { style: { whiteSpace: "nowrap" as const } } : {};
  return (
    <>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell>Payee</TableHeaderCell>
          {wide && <TableHeaderCell>Category</TableHeaderCell>}
          {wide && <TableHeaderCell>Reference</TableHeaderCell>}
          <TableHeaderCell numeric>Amount</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {MANY.map((r) => (
          <TableRow key={r.id}>
            <TableCell {...nowrap}>{r.date}</TableCell>
            <TableCell {...nowrap}>{r.payee}</TableCell>
            {wide && <TableCell {...nowrap}>{r.category}</TableCell>}
            {wide && <TableCell {...nowrap}>{r.reference}</TableCell>}
            <TableCell numeric>{r.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
}

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
/** D126 — a bare table directly in a scrolling region (like AppShell's
 * <main>), scrolled by 200px: the header stays at the region's top. */
export const Sticky: Story = {
  render: function StickyStory() {
    const ref = useScrolledTo(200);
    return (
      <div ref={ref} data-testid="sticky-region" style={{ blockSize: 240, overflow: "auto" }}>
        <Table stickyHeader>
          <ManyRows />
        </Table>
      </div>
    );
  },
};

/** D126 — a wide table in a TableContainer, 320px wide and capped at 240px,
 * scrolled both ways: the header sticks to the container's top, and the
 * frame and its corners stay put while the content moves under them. */
export const InContainer: Story = {
  render: function InContainerStory() {
    const ref = useScrolledTo(200, 120);
    return (
      <div style={{ inlineSize: 320 }}>
        <TableContainer ref={ref} maxBlockSize={240}>
          <Table stickyHeader>
            <TableCaption>Payments</TableCaption>
            <ManyRows wide />
          </Table>
        </TableContainer>
      </div>
    );
  },
};
export const Empty: Story = {
  render: () => (
    <Table>
      <TableHead><TableRow><TableHeaderCell>Date</TableHeaderCell><TableHeaderCell numeric>Amount</TableHeaderCell></TableRow></TableHead>
      <TableBody />
    </Table>
  ),
};

/** D85 — a token-paged list: a caption that names the table and states the
 * range (focus moves to it after a page change), a row header naming each
 * row, and an empty-state row spanning the columns with `colSpan`. */
export const WithCaption: Story = {
  render: () => (
    <Table>
      <TableCaption detail="Rows 51–100 of more than 100,000" tabIndex={-1}>
        Applications
      </TableCaption>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Id</TableHeaderCell>
          <TableHeaderCell>Applicant</TableHeaderCell>
          <TableHeaderCell numeric>Amount</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {ROWS.map((r, i) => (
          <TableRow key={r.id}>
            <TableCell rowHeader>APP-{1042 + i}</TableCell>
            <TableCell>{r.payee}</TableCell>
            <TableCell numeric>{r.amount}</TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell colSpan={3}>No more applications match these filters.</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
