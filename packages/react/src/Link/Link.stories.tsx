import type { Meta, StoryObj } from "storybook";
import type { AnchorHTMLAttributes, Ref } from "react";
import { Link } from "./Link.js";
import { Text } from "../Text/Text.js";
import { Stack } from "../Stack/Stack.js";
import { Panel } from "../Panel/Panel.js";
import { InlineAlert } from "../InlineAlert/InlineAlert.js";

/** D119 — a text link: the accent, underlined at rest; hover mixes toward
 * ink and thickens the line; the current page is plain medium-weight text. */
const meta: Meta<typeof Link> = {
  title: "Components/Link",
  component: Link,
};

export default meta;
type Story = StoryObj<typeof Link>;

/** A stand-in for a router's link component. */
function RouterLink({ to, ref, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; ref?: Ref<HTMLAnchorElement> }) {
  return <a ref={ref} href={to} {...rest} />;
}

/** In running text: the link takes the sentence's font. */
export const Inline: Story = {
  render: () => (
    <Text size={16}>
      Invoices are kept for seven years. Read the <Link href="#retention">retention policy</Link> before
      you delete one.
    </Text>
  ),
};

/** On its own line, sized by the Text that holds it. */
export const Standalone: Story = {
  render: () => (
    <Text size={14}>
      <Link href="#all">View all invoices</Link>
    </Text>
  ),
};

/** A row of links with the current page marked. */
export const Current: Story = {
  render: () => (
    <Text>
      <Link href="#overview">Overview</Link> · <Link href="#invoices" current>Invoices</Link> ·{" "}
      <Link href="#payments">Payments</Link>
    </Text>
  ),
};

/** A router app passes its own link; Link adds the class and, with current,
 * aria-current="page". */
export const RouterChild: Story = {
  render: () => (
    <Text>
      Go to{" "}
      <Link>
        <RouterLink to="#settings">settings</RouterLink>
      </Link>{" "}
      or back to{" "}
      <Link current>
        <RouterLink to="#home">home</RouterLink>
      </Link>
      .
    </Text>
  ),
};

/** On the elevated surface (bgSecondary, gated by D119) and on a status
 * tint. */
export const OnSurfaces: Story = {
  render: () => (
    <Stack gap={16}>
      <Panel>
        <Text>
          This panel sits on the elevated surface. <Link href="#panel">A link here</Link> is gated at 4.5.
        </Text>
      </Panel>
      <InlineAlert variant="danger" title="Payment failed">
        The card was declined. <Link href="#billing">Update billing details</Link>.
      </InlineAlert>
    </Stack>
  ),
};
