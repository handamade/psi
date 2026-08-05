import type { Meta, StoryObj } from "storybook";
import { Pagination } from "./Pagination.js";

const meta: Meta<typeof Pagination> = { title: "Data/Pagination", component: Pagination };
export default meta;
type Story = StoryObj<typeof Pagination>;

export const SinglePage: Story = { args: { page: 1, pageCount: 1, onPageChange: () => {} } };
export const SevenPages: Story = { args: { page: 4, pageCount: 7, onPageChange: () => {} } };
export const HundredPages: Story = { args: { page: 50, pageCount: 100, onPageChange: () => {} } };
