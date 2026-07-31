import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { MenuSeparator } from "./MenuSeparator.js";
import { Button } from "../Button/Button.js";
import type { MenuPlacement } from "./Menu.js";

const meta: Meta<typeof Menu> = {
  title: "Components/Menu",
  component: Menu,
};
export default meta;

type Story = StoryObj<typeof Menu>;

const items = (
  <>
    <MenuItem onSelect={() => {}}>Edit</MenuItem>
    <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
    <MenuSeparator />
    <MenuItem onSelect={() => {}} variant="danger">Delete</MenuItem>
  </>
);

export const Default: Story = {
  args: { open: true, onClose: () => {}, placement: "bottom-start", "aria-label": "Row actions" },
  render: (args) => (
    <Menu {...args} trigger={<Button size={32}>Actions</Button>}>{items}</Menu>
  ),
};

const placements: MenuPlacement[] = ["bottom-start", "bottom-end", "top-start", "top-end"];

export const Placements: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 120, gridTemplateColumns: "1fr 1fr", padding: 120 }}>
      {placements.map((placement) => (
        <Menu
          key={placement}
          open
          onClose={() => {}}
          placement={placement}
          aria-label={placement}
          trigger={<Button size={32}>{placement}</Button>}
        >
          {items}
        </Menu>
      ))}
    </div>
  ),
};

export const WithDisabledItem: Story = {
  args: { open: true, onClose: () => {}, placement: "bottom-start", "aria-label": "Row actions" },
  render: (args) => (
    <Menu {...args} trigger={<Button size={32}>Actions</Button>}>
      <MenuItem onSelect={() => {}}>Edit</MenuItem>
      <MenuItem onSelect={() => {}} disabled>Archive</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => {}} variant="danger">Delete</MenuItem>
    </Menu>
  ),
};

/** Forces the sub-anchor-floor branch so VR captures the fallback placement
 * rather than trusting whatever the CI browser happens to support. */
export const FallbackPlacement: Story = {
  decorators: [
    (StoryFn) => {
      const original = CSS.supports.bind(CSS);
      CSS.supports = ((prop: string, value?: string) =>
        prop === "anchor-name" ? false : original(prop, value as string)) as typeof CSS.supports;
      return <StoryFn />;
    },
  ],
  args: { open: true, onClose: () => {}, placement: "bottom-start", "aria-label": "Row actions" },
  render: (args) => (
    <Menu {...args} trigger={<Button size={32}>Actions</Button>}>{items}</Menu>
  ),
};
