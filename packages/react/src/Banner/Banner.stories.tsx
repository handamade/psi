import type { Meta, StoryObj } from "storybook";
import { Button } from "../Button/Button.js";
import { Banner } from "./Banner.js";

/** A Banner is a full-width strip, so the stories render it edge to edge. It
 * is not a live region: nothing here announces anything. */
const meta: Meta<typeof Banner> = {
  title: "Feedback/Banner",
  component: Banner,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof Banner>;

export const Neutral: Story = {
  args: { variant: "neutral", children: "Scheduled maintenance on Saturday, 02:00 to 04:00 UTC." },
};
export const Success: Story = {
  args: { variant: "success", children: "Your bank account is verified." },
};
export const Warning: Story = {
  args: { variant: "warning", children: "Your trial ends in 3 days." },
};
export const Danger: Story = {
  args: { variant: "danger", children: "We could not reach the payment provider." },
};

export const WithActionAndDismiss: Story = {
  args: {
    variant: "danger",
    title: "Payment failed",
    children: "Your card was declined. Update it to keep your plan active.",
    action: (
      <Button variant="ghost" size={32}>
        Update card
      </Button>
    ),
    onDismiss: () => {},
  },
};

export const TitleOnly: Story = {
  args: { variant: "warning", title: "Read-only mode", children: null },
};
