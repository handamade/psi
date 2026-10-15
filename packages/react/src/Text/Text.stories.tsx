import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Text } from "./Text.js";
import { Stack } from "../Stack/Stack.js";

const meta: Meta<typeof Text> = {
  title: "Components/Text",
  component: Text,
  argTypes: {
    as: { control: "select", options: ["p", "span", "div", "h2", "h3", "h4"] },
    size: { control: "select", options: [12, 14, 16, 18] },
    weight: { control: "select", options: ["regular", "medium"] },
    tone: { control: "select", options: ["primary", "secondary"] },
  },
};

export default meta;
type Story = StoryObj<typeof Text>;

export const Default: Story = {
  args: { children: "A paragraph at the body style, 14 on 20." },
};

/** D109: every size and weight, in both tones. */
export const Styles: Story = {
  render: () => (
    <Stack gap={12}>
      {([18, 16, 14, 12] as const).map((size) => (
        <Stack key={size} gap={4}>
          <Text size={size} weight="medium">Medium {size}</Text>
          <Text size={size}>Regular {size}</Text>
          <Text size={size} tone="secondary">Secondary {size}</Text>
        </Stack>
      ))}
    </Stack>
  ),
};

/** A heading's level follows the outline; its size follows the design. */
export const Heading: Story = {
  render: () => (
    <Stack gap={8}>
      <Text as="h3" size={16} weight="medium">No invoices yet</Text>
      <Text tone="secondary">Invoices you send appear here.</Text>
    </Stack>
  ),
};
