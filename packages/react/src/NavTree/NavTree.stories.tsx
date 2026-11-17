import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "storybook";
import { NavTree } from "./NavTree.js";
import { NavGroup } from "./NavGroup.js";
import { NavItem } from "./NavItem.js";
import { Count } from "../Count/Count.js";
import { IconSimCard } from "../icons/IconSimCard.js";
import { IconUser } from "../icons/IconUser.js";
import { IconSettings } from "../icons/IconSettings.js";
import { IconSearch } from "../icons/IconSearch.js";
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

/** D124: an icon before each entry and group label. One group is closed, and
 * its icon stays. The page is current, and a parent is marked
 * aria-current="true". Icons take the text's colour. */
export const WithIcons: Story = {
  render: () => (
    <Frame>
      <NavTree aria-label="Main">
        <NavItem href="#search" icon={<IconSearch />}>
          Search
        </NavItem>
        <NavGroup label="Cards" icon={<IconSimCard />} open onOpenChange={() => {}}>
          <NavItem href="#active" current>
            Active
          </NavItem>
          <NavItem>
            <a href="#archived" aria-current="true">
              Archived
            </a>
          </NavItem>
        </NavGroup>
        <NavGroup label="Settings" icon={<IconSettings />} open={false} onOpenChange={() => {}}>
          <NavItem href="#profile" icon={<IconUser />}>
            Profile
          </NavItem>
        </NavGroup>
      </NavTree>
    </Frame>
  ),
};

/** D124: counts at the end of an entry. Neutral and attention, a capped one,
 * a long label that wraps, and the current entry with a count. */
export const WithCounts: Story = {
  render: () => (
    <Frame>
      <NavTree aria-label="Main">
        <NavItem href="#cards" icon={<IconSimCard />} count={<Count value={238} />} current>
          Cards
        </NavItem>
        <NavItem href="#stuck" icon={<IconSearch />} count={<Count value={4} tone="attention" label="4 stuck" />}>
          Stuck
        </NavItem>
        <NavItem href="#all" count={<Count value={1204} />}>
          All records
        </NavItem>
        <NavItem href="#long" icon={<IconUser />} count={<Count value={12} />}>
          Customers waiting for a reply from the support team
        </NavItem>
      </NavTree>
    </Frame>
  ),
};
