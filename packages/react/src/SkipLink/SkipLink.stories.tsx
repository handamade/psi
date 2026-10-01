import type { Meta, StoryObj } from "storybook";
import { SkipLink } from "./SkipLink.js";

/** D88 — a plain anchor, no script. Press Tab to bring it into view; Enter
 * moves focus to the target, which must be focusable (`tabIndex={-1}`). */
const meta: Meta<typeof SkipLink> = { title: "Components/SkipLink", component: SkipLink };
export default meta;
type Story = StoryObj<typeof SkipLink>;

export const Default: Story = {
  args: { href: "#main", children: "Skip to content" },
  render: (args) => (
    <>
      <SkipLink {...args} />
      <p>Press Tab: the skip link appears at the top corner, ringed.</p>
      <main id="main" tabIndex={-1}>
        <h2>Main content</h2>
        <p>The target is focusable but not a tab stop.</p>
      </main>
    </>
  ),
};
