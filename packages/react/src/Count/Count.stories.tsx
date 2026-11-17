import { useState } from "react";
import type { Meta, StoryObj } from "storybook";
import { Count } from "./Count.js";
import { Tabs } from "../Tabs/Tabs.js";
import { TabList } from "../Tabs/TabList.js";
import { Tab } from "../Tabs/Tab.js";
import { TabPanel } from "../Tabs/TabPanel.js";
import { Table } from "../Table/Table.js";
import { TableCaption } from "../Table/TableCaption.js";
import { TableHead } from "../Table/TableHead.js";
import { TableBody } from "../Table/TableBody.js";
import { TableRow } from "../Table/TableRow.js";
import { TableHeaderCell } from "../Table/TableHeaderCell.js";
import { TableCell } from "../Table/TableCell.js";

const meta: Meta<typeof Count> = { title: "Components/Count", component: Count };
export default meta;
type Story = StoryObj<typeof Count>;

/** A quiet bare number: 12/16 regular, fg-secondary, tabular numerals. */
export const Neutral: Story = { args: { value: 238 } };

/** A pill in the warning tint and medium weight. It carries a label, because
 * the tone is visual only. */
export const Attention: Story = { args: { value: 4, tone: "attention", label: "4 stuck" } };

/** The cap: 998 and 999 show as they are, 1000 shows 999+, and max={99} caps 100 at 99+. */
export const Capped: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Count value={998} />
      <Count value={999} />
      <Count value={1000} />
      <Count value={100} max={99} />
      <Count value={1000} tone="attention" label="1000 stuck" />
    </div>
  ),
};

/** label replaces the number for a screen reader; the screen shows the number. */
export const WithLabel: Story = { args: { value: 12, label: "12 unread" } };

function TabAndCaption() {
  // Tabs is controlled-only (D67), so the story owns the selection.
  const [value, setValue] = useState("inbox");
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Tabs value={value} onValueChange={setValue}>
        <TabList aria-label="Mail">
          <Tab value="inbox">
            Inbox <Count value={12} />
          </Tab>
          <Tab value="stuck">
            Stuck <Count value={4} tone="attention" label="4 stuck" />
          </Tab>
        </TabList>
        <TabPanel value="inbox">Inbox</TabPanel>
        <TabPanel value="stuck">Stuck</TabPanel>
      </Tabs>
      <Table>
        <TableCaption>
          Cards <Count value={238} />
        </TableCaption>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>First card</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

/** Count is an ordinary inline child of a Tab or a TableCaption, after a space. */
export const InTabAndCaption: Story = { render: () => <TabAndCaption /> };
