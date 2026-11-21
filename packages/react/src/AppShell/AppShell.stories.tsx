import { useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { Meta, StoryObj } from "storybook";
import { AppShell } from "./AppShell.js";
import { SkipLink } from "../SkipLink/SkipLink.js";
import { NavBar } from "../NavBar/NavBar.js";
import { Button } from "../Button/Button.js";
import { IconButton } from "../IconButton/IconButton.js";
import { IconMenu } from "../icons/IconMenu.js";
import { IconSettings } from "../icons/IconSettings.js";
import { IconUser } from "../icons/IconUser.js";
import { IconSearch } from "../icons/IconSearch.js";
import { Banner } from "../Banner/Banner.js";
import { NavTree } from "../NavTree/NavTree.js";
import { NavGroup } from "../NavTree/NavGroup.js";
import { NavItem } from "../NavTree/NavItem.js";
import { PageHeading } from "../PageHeading/PageHeading.js";
import "./AppShell.stories.css";

/** D88 — the frame of an application: a header row over a sidebar and a
 * `main` that each scroll on their own, so nothing hides under the header.
 * Press Tab for the skip link; Enter lands focus in `main`. */
const meta: Meta<typeof AppShell> = {
  title: "Components/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="psi-story-app-root">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof AppShell>;

/** The Menu toggle, the groups and the open state are the story's: AppShell
 * and NavGroup are controlled. Links use `#` fragments so a click never
 * leaves the story. */
function Demo({
  initialOpen,
  shellStyle,
  headerProps,
  headerText,
  banner,
  plainSidebar,
  brandAligned,
  sidebarMotion,
}: {
  initialOpen: boolean;
  /** D142: the sidebar's open and close. */
  sidebarMotion?: "instant" | "slide";
  shellStyle?: CSSProperties;
  headerProps?: HTMLAttributes<HTMLElement> & { "data-psi-theme"?: string };
  headerText?: string;
  banner?: ReactNode;
  /** Leave the sidebar on the page's theme, where a line sets it apart (D114). */
  plainSidebar?: boolean;
  /** D140: an icon Menu toggle and a brand that line up with the sidebar, and
   * icons on the sidebar's entries. */
  brandAligned?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [reports, setReports] = useState(true);
  const [settings, setSettings] = useState(false);
  return (
    <AppShell
      sidebarOpen={open}
      sidebarMotion={sidebarMotion}
      sidebarTheme={plainSidebar ? undefined : "dark"}
      style={shellStyle}
      banner={banner}
      skipLink={<SkipLink href="#main">Skip to content</SkipLink>}
      header={
        <NavBar
          fluid
          brandAlign={brandAligned ? "sidebar" : undefined}
          {...headerProps}
          brand={
            brandAligned ? (
              <>
                <IconButton
                  variant="ghost"
                  aria-label="Menu"
                  aria-expanded={open}
                  aria-controls="sidebar"
                  onClick={() => setOpen((o) => !o)}
                >
                  <IconMenu size={16} />
                </IconButton>
                <a href="#overview">Acme</a>
              </>
            ) : (
            <>
              <Button
                variant="ghost"
                size={32}
                aria-expanded={open}
                aria-controls="sidebar"
                onClick={() => setOpen((o) => !o)}
              >
                Menu
              </Button>
              <a href="#overview">Acme</a>
            </>
            )
          }
          actions={
            <>
              {headerText && <span>{headerText}</span>}
              <Button variant="neutral" size={32}>
                Account
              </Button>
            </>
          }
        />
      }
      sidebar={
        <NavTree aria-label="Main">
          <NavItem icon={brandAligned ? <IconSearch /> : undefined}>
            <a href="#overview">Overview</a>
          </NavItem>
          <NavGroup
            label="Reports"
            icon={brandAligned ? <IconUser /> : undefined}
            open={reports}
            onOpenChange={setReports}
          >
            <NavItem>
              <a href="#sales" aria-current="page">
                Sales
              </a>
            </NavItem>
            <NavItem>
              <a href="#traffic">Traffic</a>
            </NavItem>
          </NavGroup>
          <NavGroup
            label="Settings"
            icon={brandAligned ? <IconSettings /> : undefined}
            open={settings}
            onOpenChange={setSettings}
          >
            <NavItem>
              <a href="#profile">Profile</a>
            </NavItem>
            <NavItem>
              <a href="#billing">Billing</a>
            </NavItem>
          </NavGroup>
        </NavTree>
      }
    >
      <PageHeading>Sales</PageHeading>
      {Array.from({ length: 40 }, (_, i) => (
        <p key={i}>
          Row {i + 1} of a long page, with <a href={`#row-${i + 1}`}>a link to row {i + 1}</a>. Only main scrolls.
        </p>
      ))}
    </AppShell>
  );
}

/** Open: a dark sidebar inside the light page, and a long `main` that scrolls
 * on its own under a header that stays put. */
export const Default: Story = { render: () => <Demo initialOpen /> };

/** Closed: the sidebar is `hidden`, not narrowed; `main` takes the full width
 * and the Menu toggle reads `aria-expanded="false"`. */
export const SidebarClosed: Story = { render: () => <Demo initialOpen={false} /> };

/** D110 — what a theme file sets, written inline so the story shows it. The
 * root's colour is the `dark` theme's `bgPrimary`: no `var()` reaches a sub-theme
 * from the page's scope. app-shell.interaction.spec.ts fails if the two drift. */
const frameStyle = {
  "--psi-app-shell-bg": "oklch(0.15 0.01 250)",
  "--psi-app-shell-main-bg": "var(--psi-bg-primary)",
  "--psi-app-shell-main-radius": "var(--psi-radius-12)",
} as CSSProperties;

const frameHeader = {
  "data-psi-theme": "dark",
  style: {
    "--psi-navbar-bg": "var(--psi-bg-primary)",
    "--psi-navbar-border-width": "0",
  } as CSSProperties,
};

/** One dark theme over the header and the sidebar, with no line between them,
 * and `main` a surface with a rounded top-start corner beside them. Plain text in
 * the header takes the dark theme's foreground, not the page's (D111). */
export const Frame: Story = {
  render: () => (
    <Demo initialOpen shellStyle={frameStyle} headerProps={frameHeader} headerText="Signed in as Ada" />
  ),
};

/** D140 — `brandAlign="sidebar"` on the `NavBar`: the Menu toggle's icon sits
 * on the sidebar's icon column and the brand spans the sidebar's width, under
 * the header's own dark theme. The header reads the page's sidebar width
 * through the sub-theme (D139). */
export const BrandAligned: Story = {
  render: () => (
    <Demo initialOpen brandAligned shellStyle={frameStyle} headerProps={frameHeader} headerText="Signed in as Ada" />
  ),
};

/** With the sidebar closed the corner squares: it would be a notch against the
 * viewport's edge. */
export const FrameSidebarClosed: Story = {
  render: () => (
    <Demo initialOpen={false} shellStyle={frameStyle} headerProps={frameHeader} headerText="Signed in as Ada" />
  ),
};

/** D113 — a page banner passed to `banner`: edge to edge above the page, which
 * starts one block padding below it. The banner scrolls with the page. */
export const WithBanner: Story = {
  render: () => (
    <Demo
      initialOpen
      banner={
        <Banner
          variant="warning"
          title="Sales data is two hours old"
          action={
            <Button variant="ghost" size={32}>
              Refresh
            </Button>
          }
        >
          The last sync failed, so figures may be out of date.
        </Banner>
      }
    />
  ),
};

/** D114 — a sidebar on the page's own theme, set apart by a line:
 * `--psi-app-shell-sidebar-border-width` at `1px`. It is `0` by default. */
export const SidebarLine: Story = {
  render: () => (
    <Demo
      initialOpen
      plainSidebar
      shellStyle={{ "--psi-app-shell-sidebar-border-width": "1px" } as CSSProperties}
    />
  ),
};

/** D142 — `sidebarMotion="slide"`: Menu runs the sidebar's column to 0 and
 * back over `--psi-app-shell-sidebar-duration` and `-ease` (the `move` preset),
 * fading it, while its content holds still. Open, it looks exactly like
 * Default. Instant under `prefers-reduced-motion`. */
export const Sliding: Story = { render: () => <Demo initialOpen sidebarMotion="slide" /> };

/** D142 — the same frame closed: the sidebar's column is 0px and the sidebar
 * `visibility: hidden`, out of the tab order; `main` takes the width. */
export const SlidingClosed: Story = { render: () => <Demo initialOpen={false} sidebarMotion="slide" /> };
