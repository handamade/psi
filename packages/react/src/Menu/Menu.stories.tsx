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
 * rather than trusting whatever the CI browser happens to support.
 *
 * Both halves are needed. Stubbing `CSS.supports` only convinces *our JS* the
 * feature is missing — the browser still evaluates `@supports (anchor-name:
 * --x)` itself, and every browser Playwright runs supports it. Without the
 * style override the two positioning systems both apply and fight, which is
 * not a state any real browser can be in. Neutralising `position-area` and
 * `position-try-fallbacks` leaves the JS branch's inline inset as the only
 * thing placing the popover — which is exactly what a sub-floor browser does. */
export const FallbackPlacement: Story = {
  decorators: [
    (StoryFn) => {
      const original = CSS.supports.bind(CSS);
      CSS.supports = ((prop: string, value?: string) =>
        prop === "anchor-name" ? false : original(prop, value as string)) as typeof CSS.supports;
      return (
        <>
          {/* !important is load-bearing: the CSS module's
              `.menu[data-placement="…"]` is specificity (0,2,0) and would
              otherwise beat this selector's (0,1,0). */}
          <style>{`[data-psi-menu] { position-area: normal !important; position-try-fallbacks: none !important; }`}</style>
          <StoryFn />
        </>
      );
    },
  ],
  args: { open: true, onClose: () => {}, placement: "bottom-start", "aria-label": "Row actions" },
  render: (args) => (
    <Menu {...args} trigger={<Button size={32}>Actions</Button>}>{items}</Menu>
  ),
};
