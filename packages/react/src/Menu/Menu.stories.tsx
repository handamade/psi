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

/** One story per placement, deliberately NOT combined into a grid.
 *
 * popover="auto" mutually dismisses: showing one auto popover closes every
 * other open one that is not its ancestor, so four sibling menus cannot be
 * open at once — React runs the four sync effects in tree order and only the
 * last-mounted survives. The old combined `Placements` story rendered exactly
 * one menu and looked broken. Verified directly in the browser:
 *   a.showPopover()  // {a: true,  b: false}
 *   b.showPopover()  // {a: false, b: true}   <- showing b closed a
 * Do not merge these back together. (D58) */
function placementStory(placement: MenuPlacement): Story {
  return {
    args: { open: true, onClose: () => {}, placement, "aria-label": `Menu ${placement}` },
    render: (args) => (
      <div style={{ padding: 120 }}>
        <Menu {...args} trigger={<Button size={32}>{placement}</Button>}>
          {items}
        </Menu>
      </div>
    ),
  };
}

export const PlacementBottomStart: Story = placementStory("bottom-start");
export const PlacementBottomEnd: Story = placementStory("bottom-end");
export const PlacementTopStart: Story = placementStory("top-start");
export const PlacementTopEnd: Story = placementStory("top-end");

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
 * Both halves are required, and each was verified in a browser. Stubbing
 * `CSS.supports` only convinces *our JS* the feature is missing; the browser
 * still evaluates `@supports (anchor-name: --x)` itself and keeps applying
 * `position-area`, which overrides the JS branch's inline `top`/`left`. Left
 * alone, the popover lands at the viewport corner instead of under its
 * trigger. Two details bite here: `!important` is needed because the CSS
 * module's `.menu[data-placement="..."]` is specificity (0,2,0), and the
 * reset value must be `none` — `position-area`'s initial value is `none`, so
 * `normal` is invalid and gets dropped silently, !important or not. */
export const FallbackPlacement: Story = {
  decorators: [
    (StoryFn) => {
      const original = CSS.supports.bind(CSS);
      CSS.supports = ((prop: string, value?: string) =>
        prop === "anchor-name" ? false : original(prop, value as string)) as typeof CSS.supports;
      return (
        <>
          <style>{`[data-psi-menu] { position-area: none !important; position-try-fallbacks: none !important; }`}</style>
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

/** Two menus sharing one `openId` — the shape of the `row-actions` pattern.
 *  Exists to pin D58: switching from A to B must leave B open. `onClose` is
 *  written the naive way on purpose; the component, not the consumer, is what
 *  has to make that correct. Driven by `apps/storybook/vr/menu.interaction.spec.ts`. */
function SwitchingDemo() {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [lastReason, setLastReason] = React.useState<string>("none");

  return (
    <div style={{ display: "flex", gap: 24, padding: 40, alignItems: "flex-start" }}>
      {(["a", "b"] as const).map((id) => (
        <Menu
          key={id}
          open={openId === id}
          onClose={(reason) => {
            setLastReason(reason);
            setOpenId(null);
          }}
          aria-label={`Menu ${id}`}
          trigger={
            <Button
              size={32}
              onClick={() => setOpenId((current) => (current === id ? null : id))}
            >
              {id.toUpperCase()}
            </Button>
          }
        >
          <MenuItem onSelect={() => {}}>Edit</MenuItem>
          <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
        </Menu>
      ))}
      <span data-testid="last-reason">{lastReason}</span>
    </div>
  );
}

export const SwitchingBetweenMenus: Story = {
  render: () => <SwitchingDemo />,
};
