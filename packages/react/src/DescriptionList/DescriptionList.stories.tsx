import React from "react";
import type { Meta, StoryObj } from "storybook";
import { DescriptionList } from "./DescriptionList.js";
import { DescriptionItem } from "./DescriptionItem.js";

const meta: Meta<typeof DescriptionList> = {
  title: "Components/DescriptionList",
  component: DescriptionList,
  argTypes: {
    layout: { control: "inline-radio", options: ["stacked", "inline"] },
    gap: { control: "select", options: [8, 12, 16] },
  },
};

export default meta;
type Story = StoryObj<typeof DescriptionList>;

const record = (
  <>
    <DescriptionItem term="Date">7 Aug 2026</DescriptionItem>
    <DescriptionItem term="Payee">Acme Corporation</DescriptionItem>
    <DescriptionItem term="Category">Software</DescriptionItem>
    <DescriptionItem term="Amount">$1,240.00</DescriptionItem>
  </>
);

export const Stacked: Story = {
  args: { layout: "stacked", children: record },
};

export const Inline: Story = {
  args: { layout: "inline", children: record },
};

export const Gap16: Story = {
  args: { layout: "inline", gap: 16, children: record },
};

/** The value column has to absorb a long unbroken string without widening the
 * container it sits in — a drawer is typically 400px. */
export const LongValueWraps: Story = {
  args: {
    layout: "inline",
    children: (
      <>
        <DescriptionItem term="Reference">
          TXN-9f2c4e7a1b8d63f05c9e2a7b4d1f8c60e3a5b9d7
        </DescriptionItem>
        <DescriptionItem term="Amount">$1,240.00</DescriptionItem>
      </>
    ),
  },
};
