import type { Meta, StoryObj } from "storybook";
import { CopyButton } from "./CopyButton.js";

/** D86 — copies a value and says nothing: not a live region, and the label
 * never changes after a copy. The application speaks the result from `onCopy`. */
const meta: Meta<typeof CopyButton> = { title: "Feedback/CopyButton", component: CopyButton };
export default meta;
type Story = StoryObj<typeof CopyButton>;

export const Default: Story = { args: { value: "ORD-1042" } };

export const Neutral: Story = { args: { value: "ORD-1042", variant: "neutral" } };

export const Size40: Story = { args: { value: "ORD-1042", size: 40 } };
