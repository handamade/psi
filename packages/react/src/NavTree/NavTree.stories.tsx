import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "storybook";
import { NavTree } from "./NavTree.js";
import { NavGroup } from "./NavGroup.js";
import { NavItem } from "./NavItem.js";
import "./NavTree.stories.css";

const meta: Meta<typeof NavTree> = { title: "Components/NavTree", component: NavTree };
export default meta;
type Story = StoryObj<typeof NavTree>;

/** NavGroup is controlled (D88), so the story owns each group's state. Links use
 * `#` fragments so a click never leaves the story. */
function Demo({ initial }: { initial: { reports: boolean; settings: boolean } }) {
  const [reports, setReports] = useState(initial.reports);
  const [settings, setSettings] = useState(initial.settings);
  return (
    <NavTree aria-label="Main">
      <NavItem>
        <a href="#overview">Overview</a>
      </NavItem>
      <NavGroup label="Reports" open={reports} onOpenChange={setReports}>
        <NavItem>
          <a href="#sales" aria-current="page">
            Sales
          </a>
        </NavItem>
        <NavItem>
          <a href="#traffic">Traffic</a>
        </NavItem>
        <NavItem>
          <a href="#retention">Retention</a>
        </NavItem>
      </NavGroup>
      <NavGroup label="Settings" open={settings} onOpenChange={setSettings}>
        <NavItem>
          <a href="#profile">Profile</a>
        </NavItem>
        <NavItem>
          <a href="#billing">Billing</a>
        </NavItem>
      </NavGroup>
    </NavTree>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <div style={{ inlineSize: "16rem" }}>{children}</div>;
}

/** Two groups, one open, with the current page marked by `aria-current`. */
export const Default: Story = {
  render: () => (
    <Frame>
      <Demo initial={{ reports: true, settings: false }} />
    </Frame>
  ),
};

/** Every group closed: only the top-level entries and group buttons remain. */
export const Collapsed: Story = {
  render: () => (
    <Frame>
      <Demo initial={{ reports: false, settings: false }} />
    </Frame>
  ),
};

/** A dark sub-theme inside the light page: the tokens resolve to their dark
 * values, and the wrapper paints `--psi-bg-primary` itself. */
export const DarkSidebar: Story = {
  render: () => (
    <div data-psi-theme="dark" className="psi-story-dark-sidebar">
      <Demo initial={{ reports: true, settings: false }} />
    </div>
  ),
};

/** D96: the current screen is a customer's detail, which sits under
 * Customers and is not in the tree. The entry's link carries
 * `aria-current="true"`: current colour and medium weight, with no surface
 * and no bar, which stay the marks of the page itself. */
export const ParentCurrent: Story = {
  render: () => (
    <Frame>
      <NavTree aria-label="Main">
        <NavItem>
          <a href="#overview">Overview</a>
        </NavItem>
        <NavItem>
          <a href="#customers" aria-current="true">
            Customers
          </a>
        </NavItem>
        <NavItem>
          <a href="#invoices">Invoices</a>
        </NavItem>
      </NavTree>
    </Frame>
  ),
};
