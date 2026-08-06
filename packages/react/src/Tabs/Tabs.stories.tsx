import { useState } from "react";
import type { Meta, StoryObj } from "storybook";
import { Tabs } from "./Tabs.js";
import { TabList } from "./TabList.js";
import { Tab } from "./Tab.js";
import { TabPanel } from "./TabPanel.js";

const meta: Meta<typeof Tabs> = { title: "Components/Tabs", component: Tabs };
export default meta;
type Story = StoryObj<typeof Tabs>;

/** Tabs is controlled-only (D67), so every story owns the selection. */
function Demo({
  orientation,
  withDisabled = false,
  count = 3,
}: {
  orientation?: "horizontal" | "vertical";
  withDisabled?: boolean;
  count?: number;
}) {
  const labels = ["All", "Uncategorised", "This month", "Flagged", "Transfers", "Fees", "Refunds"];
  const values = labels.map((l) => l.toLowerCase().replace(/\s+/g, "-"));
  const [value, setValue] = useState(values[0]);

  return (
    <Tabs value={value} onValueChange={setValue} orientation={orientation}>
      <TabList aria-label="Saved views">
        {labels.slice(0, count).map((label, i) => (
          <Tab key={values[i]} value={values[i]} disabled={withDisabled && i === 1}>
            {label}
          </Tab>
        ))}
      </TabList>
      {labels.slice(0, count).map((label, i) => (
        <TabPanel key={values[i]} value={values[i]}>
          {label} — 40 transactions.
        </TabPanel>
      ))}
    </Tabs>
  );
}

export const Horizontal: Story = { render: () => <Demo /> };
export const Vertical: Story = { render: () => <Demo orientation="vertical" /> };
export const WithDisabledTab: Story = { render: () => <Demo withDisabled /> };
export const ManyTabs: Story = { render: () => <Demo count={7} /> };
