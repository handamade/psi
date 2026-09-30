import type { Meta, StoryObj } from "storybook";
import { CursorPagination } from "./CursorPagination.js";

/** D85 — a pager for a list that pages by opaque token: no page count, no
 * numbers, two buttons with visible words. The consumer holds the tokens. */
const meta: Meta<typeof CursorPagination> = { title: "Data/CursorPagination", component: CursorPagination };
export default meta;
type Story = StoryObj<typeof CursorPagination>;

const noop = () => {};

export const Default: Story = {
  args: { hasPrevious: true, hasNext: true, onPrevious: noop, onNext: noop },
};

export const FirstPage: Story = {
  args: { hasPrevious: false, hasNext: true, onPrevious: noop, onNext: noop },
};

export const LastPage: Story = {
  args: { hasPrevious: true, hasNext: false, onPrevious: noop, onNext: noop },
};

export const Size40: Story = {
  args: { hasPrevious: true, hasNext: true, onPrevious: noop, onNext: noop, size: 40 },
};

export const Translated: Story = {
  args: {
    hasPrevious: true,
    hasNext: true,
    onPrevious: noop,
    onNext: noop,
    previousLabel: "Zurück",
    nextLabel: "Weiter",
    "aria-label": "Seiten",
  },
};
