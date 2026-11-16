import type { Meta, StoryObj } from "storybook";
import { PageHeading } from "./PageHeading.js";
import { Stack } from "../Stack/Stack.js";
import { Text } from "../Text/Text.js";

/** D118 — the page's one h1, at 24/32 medium in the brand's display face,
 * margin 0. */
const meta: Meta<typeof PageHeading> = {
  title: "Components/PageHeading",
  component: PageHeading,
};

export default meta;
type Story = StoryObj<typeof PageHeading>;

export const Default: Story = {
  args: { children: "Sales" },
};

/** Over the page's own lines: a supporting line, a section headline in Text,
 * and body text. */
export const InAPage: Story = {
  render: () => (
    <Stack gap={16}>
      <PageHeading>Sales</PageHeading>
      <Text tone="secondary">Invoices from the last 30 days.</Text>
      <Text as="h2" size={18} weight="medium">Overdue</Text>
      <Text>Three invoices are past their due date.</Text>
    </Stack>
  ),
};
