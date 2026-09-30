import type { Meta, StoryObj } from "storybook";
import { Table } from "../Table/Table.js";
import { TableHead } from "../Table/TableHead.js";
import { TableBody } from "../Table/TableBody.js";
import { TableRow } from "../Table/TableRow.js";
import { TableCell } from "../Table/TableCell.js";
import { TableHeaderCell } from "../Table/TableHeaderCell.js";
import { Skeleton } from "./Skeleton.js";

/** A Skeleton is hidden from assistive tech and is not a live region; the
 * region it stands for carries `aria-busy`. Its width fills the container. */
const meta: Meta<typeof Skeleton> = {
  title: "Feedback/Skeleton",
  component: Skeleton,
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Text: Story = { args: { variant: "text" } };
export const ThreeLines: Story = { args: { variant: "text", lines: 3 } };
export const Block: Story = { args: { variant: "block", size: 48 } };

export const InATable: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 560 }}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Table aria-label="Transactions, loading">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell>Payee</TableHeaderCell>
          <TableHeaderCell numeric>Amount</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody aria-busy="true">
        {[0, 1, 2].map((row) => (
          <TableRow key={row}>
            <TableCell><Skeleton /></TableCell>
            <TableCell><Skeleton /></TableCell>
            <TableCell numeric><Skeleton /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
