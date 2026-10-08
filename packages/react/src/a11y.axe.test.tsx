import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import {
  Button, IconButton, Card, Panel, NavBar, AspectRatio, Field, Dialog, Input, Select, Checkbox, Switch, Tag, Tooltip, Toolbar,
  Menu, MenuItem, MenuSeparator,
  Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, TableCaption, Pagination, CursorPagination,
  Toast, ToastRegion, Announcement, Banner, InlineAlert, Skeleton, CopyButton, SkipLink, NavTree, NavGroup, NavItem, AppShell,
  Tabs, TabList, Tab, TabPanel,
  useFieldControl,
} from "./index.js";

/** A control Psi did not write, joined to a Field through useFieldControl (D84). */
function CustomCombobox() {
  const field = useFieldControl();
  return <div role="combobox" tabIndex={0} aria-expanded="false" aria-label="Airline" {...field} />;
}

const cases: Array<[string, React.ReactElement]> = [
  ["Button", <Button>Save</Button>],
  ["Button as disabled anchor", <Button href="/x" disabled>Link</Button>],
  ["IconButton", <IconButton aria-label="Close"><svg aria-hidden="true" /></IconButton>],
  ["Card", <Card variant="stacked" media={<img alt="" src="x.png" />}>Body</Card>],
  ["Panel", <Panel><h3>Usage</h3><p>Elevated surface body.</p></Panel>],
  ["NavBar", <NavBar brand={<a href="/">DK</a>} actions={<Button size={32}>CTA</Button>}><a href="/a">A</a></NavBar>],
  ["NavBar with no links", <NavBar brand={<a href="/">DK</a>} actions={<Button size={32}>CTA</Button>} />],
  ["NavBar labelled and fluid", <NavBar fluid navLabel="Primary" brand={<a href="/">DK</a>}><a href="/a">A</a></NavBar>],
  ["SkipLink with a target", <><SkipLink href="#main">Skip to content</SkipLink><main id="main" tabIndex={-1}><h1>Page</h1></main></>],
  ["NavTree open", <NavTree aria-label="Main"><NavItem><a href="#o">Overview</a></NavItem><NavGroup label="Reports" open onOpenChange={() => {}}><NavItem><a href="#s" aria-current="page">Sales</a></NavItem><NavItem><a href="#t">Traffic</a></NavItem></NavGroup></NavTree>],
  ["NavTree closed", <NavTree aria-label="Main"><NavItem><a href="#o">Overview</a></NavItem><NavGroup label="Reports" open={false} onOpenChange={() => {}}><NavItem><a href="#s">Sales</a></NavItem></NavGroup></NavTree>],
  ["NavTree in a dark sub-theme", <div data-psi-theme="dark"><NavTree aria-label="Main"><NavGroup label="Reports" open onOpenChange={() => {}}><NavItem><a href="#s" aria-current="page">Sales</a></NavItem><NavItem><a href="#t">Traffic</a></NavItem></NavGroup></NavTree></div>],
  ["AppShell open", <AppShell skipLink={<SkipLink href="#main">Skip to content</SkipLink>} header={<NavBar fluid brand={<Button size={32} aria-expanded aria-controls="sidebar">Menu</Button>} />} sidebar={<NavTree aria-label="Main"><NavItem href="#o" current>Overview</NavItem></NavTree>}><h1>Page</h1></AppShell>],
  ["AppShell closed", <AppShell skipLink={<SkipLink href="#main">Skip to content</SkipLink>} header={<NavBar fluid brand={<Button size={32} aria-expanded={false} aria-controls="sidebar">Menu</Button>} />} sidebarOpen={false} sidebar={<NavTree aria-label="Main"><NavItem href="#o">Overview</NavItem></NavTree>}><h1>Page</h1></AppShell>],
  ["AppShell with a dark sidebar", <AppShell sidebarTheme="dark" skipLink={<SkipLink href="#main">Skip to content</SkipLink>} header={<NavBar fluid brand={<Button size={32} aria-expanded aria-controls="sidebar">Menu</Button>} />} sidebar={<NavTree aria-label="Main"><NavItem href="#o" current>Overview</NavItem><NavGroup label="Reports" open onOpenChange={() => {}}><NavItem href="#s">Sales</NavItem></NavGroup></NavTree>}><h1>Page</h1></AppShell>],
  ["AspectRatio", <AspectRatio ratio={16 / 10}><img alt="demo" src="x.png" /></AspectRatio>],
  ["Input", <label>Name<Input size={32} /></label>],
  ["Input error", <label>Email<Input size={32} error aria-invalid="true" /></label>],
  ["Select", <label>Plan<Select size={32}><option>Free</option></Select></label>],
  ["Field with Input", <Field label="Email" description="We never share it."><Input size={40} /></Field>],
  ["Field error", <Field label="Email" error="Invalid email." required><Input size={40} /></Field>],
  ["Field group", <Field group label="Notifications" description="Pick channels."><Checkbox>Email</Checkbox><Switch>Push</Switch></Field>],
  ["Field required in text", <Field label="Name" required requiredText="(Required)" description="As on the passport."><Input size={40} /></Field>],
  ["Field with a custom control", <Field label="Airline" error="Pick one." required><CustomCombobox /></Field>],
  ["Dialog", <Dialog open onClose={() => {}} title="Confirm" footer={<Button variant="danger">Delete</Button>}>Are you sure?</Dialog>],
  ["Dialog aria-label only", <Dialog open onClose={() => {}} aria-label="Quick action">Content</Dialog>],
  ["Dialog forced choice", <Dialog open onClose={() => {}} title="Pick one" dismissible={false} footer={<Button variant="accent">Keep</Button>}>No escape hatch.</Dialog>],
  ["Dialog as drawer (D66)", <Dialog open onClose={() => {}} placement="inline-end" title="Transaction detail" footer={<Button variant="neutral">Close</Button>}>Acme Corp — $1,240.00</Dialog>],
  ["Dialog as drawer, forced choice", <Dialog open onClose={() => {}} placement="inline-start" dismissible={false} title="Pick one" footer={<Button variant="accent">Keep</Button>}>No escape hatch.</Dialog>],
  ["Checkbox", <Checkbox>Beta features</Checkbox>],
  ["Switch", <Switch>Email notifications</Switch>],
  ["Tag", <Tag variant="accent" subtle>Pro</Tag>],
  ["Tag dismissible", <Tag variant="neutral" onDismiss={() => {}}>Filter</Tag>],
  ["Tooltip", <Tooltip content="Info"><button>Trigger</button></Tooltip>],
  ["Toolbar labeled", <Toolbar aria-label="Filters"><label>Search<Input size={32} /></label><Tag variant="neutral">Active</Tag></Toolbar>],
  ["Toolbar unlabeled", <Toolbar><Button size={32} variant="ghost">Clear</Button></Toolbar>],
  ["Toolbar as a filter form (D87)", <Toolbar as="form" align="end" gap={12} aria-label="Filters"><Field label="Device ID"><Input size={32} /></Field><Field label="Status"><Select size={32}><option>Any</option></Select></Field><Button type="submit" variant="accent" size={32}>Find</Button></Toolbar>],
  ["Toolbar as a filter form with a field in error (D92)", <Toolbar as="form" align="start" gap={12} aria-label="Filters"><Field label="Device ID"><Input size={32} /></Field><Field label="Status" error="Pick a status."><Select size={32}><option>Any</option></Select></Field><Button type="submit" variant="accent" size={32}>Find</Button></Toolbar>],
  ["Menu open", <Menu open onClose={() => {}} trigger={<Button size={32}>Actions</Button>} aria-label="Row actions"><MenuItem onSelect={() => {}}>Rename</MenuItem><MenuSeparator /><MenuItem onSelect={() => {}} variant="danger">Delete</MenuItem></Menu>],
  ["Menu with a disabled item", <Menu open onClose={() => {}} trigger={<Button size={32}>Actions</Button>} aria-label="Actions"><MenuItem onSelect={() => {}}>Rename</MenuItem><MenuItem onSelect={() => {}} disabled>Archive</MenuItem></Menu>],
  ["Table plain", (
    <Table>
      <TableHead><TableRow><TableHeaderCell>Date</TableHeaderCell><TableHeaderCell numeric>Amount</TableHeaderCell></TableRow></TableHead>
      <TableBody><TableRow rowId="t1"><TableCell>2026-08-05</TableCell><TableCell numeric>1,240.00</TableCell></TableRow></TableBody>
    </Table>
  )],
  ["Table sortable + selectable", (
    <Table sortable selectable sort={{ key: "date", direction: "asc" }} onSortChange={() => {}} selected={new Set(["t1"])} onSelectionChange={() => {}}>
      <TableHead><TableRow><TableHeaderCell sortKey="date">Date</TableHeaderCell><TableHeaderCell sortKey="amount" numeric>Amount</TableHeaderCell></TableRow></TableHead>
      <TableBody>
        <TableRow rowId="t1" selectLabel="Select 2026-08-05 Acme"><TableCell>2026-08-05</TableCell><TableCell numeric>1,240.00</TableCell></TableRow>
        <TableRow rowId="t2" selectLabel="Select 2026-08-06 Globex"><TableCell>2026-08-06</TableCell><TableCell numeric>98.50</TableCell></TableRow>
      </TableBody>
    </Table>
  )],
  ["Table with caption, row headers and a spanning cell", (
    <Table aria-busy="false">
      <TableCaption detail="Rows 51–100 of more than 100,000" tabIndex={-1}>Applications</TableCaption>
      <TableHead><TableRow><TableHeaderCell>Id</TableHeaderCell><TableHeaderCell>Status</TableHeaderCell></TableRow></TableHead>
      <TableBody>
        <TableRow><TableCell rowHeader>APP-1042</TableCell><TableCell>Pending</TableCell></TableRow>
        <TableRow><TableCell colSpan={2}>No more applications match.</TableCell></TableRow>
      </TableBody>
    </Table>
  )],
  ["CursorPagination", <CursorPagination hasPrevious hasNext onPrevious={() => {}} onNext={() => {}} />],
  ["CursorPagination at the first page", <CursorPagination hasPrevious={false} hasNext onPrevious={() => {}} onNext={() => {}} />],
  ["Pagination", <Pagination page={4} pageCount={13} onPageChange={() => {}} />],
  ["Pagination single page", <Pagination page={1} pageCount={1} onPageChange={() => {}} />],
  ["Toast in a region", <ToastRegion><Toast variant="success">Transaction voided</Toast></ToastRegion>],
  ["Toast in a region, region role (D90)", <ToastRegion><Toast variant="success">Transaction voided</Toast></ToastRegion>],
  ["Toast danger routes assertive", <ToastRegion><Toast variant="danger">Could not void the transaction</Toast></ToastRegion>],
  ["Toast with action and dismiss", <ToastRegion><Toast variant="success" action={<Button variant="ghost" size={32}>Undo</Button>} onDismiss={() => {}}>Transaction voided</Toast></ToastRegion>],
  ["Toast region empty", <ToastRegion>{null}</ToastRegion>],
  ["Toast success routed assertive", <ToastRegion><Toast variant="success" politeness="assertive">Application accepted</Toast></ToastRegion>],
  ["Toast with a translated status word", <ToastRegion><Toast variant="danger" statusLabel="Fehler:">Nicht gespeichert</Toast></ToastRegion>],
  ["Announcements beside a toast", <ToastRegion data-react-aria-top-layer=""><Toast variant="success">Saved</Toast><Announcement>Row 12 updated</Announcement><Announcement politeness="assertive">2 fields need attention</Announcement></ToastRegion>],
  ["Banner neutral", <Banner>Scheduled maintenance on Saturday.</Banner>],
  ["Banner danger with action and dismiss", <Banner variant="danger" title="Payment failed" action={<Button variant="ghost" size={32}>Retry</Button>} onDismiss={() => {}}>Your card was declined.</Banner>],
  ["InlineAlert neutral", <InlineAlert>Changes are saved automatically.</InlineAlert>],
  ["InlineAlert danger with action", <InlineAlert variant="danger" title="Payment failed" action={<Button variant="ghost" size={32}>Retry</Button>}>Your card was declined.</InlineAlert>],
  ["Skeleton text", <div aria-busy="true"><Skeleton lines={3} /></div>],
  ["Skeleton block", <div aria-busy="true"><Skeleton variant="block" size={48} /></div>],
  ["CopyButton", <CopyButton value="ORD-1042" />],
  ["Tabs horizontal", <Tabs value="all" onValueChange={() => {}}><TabList aria-label="Views"><Tab value="all">All</Tab><Tab value="flagged">Flagged</Tab></TabList><TabPanel value="all">All rows</TabPanel><TabPanel value="flagged">Flagged rows</TabPanel></Tabs>],
  ["Tabs vertical", <Tabs value="all" onValueChange={() => {}} orientation="vertical"><TabList aria-label="Views"><Tab value="all">All</Tab><Tab value="flagged">Flagged</Tab></TabList><TabPanel value="all">All rows</TabPanel><TabPanel value="flagged">Flagged rows</TabPanel></Tabs>],
  ["Tabs with a disabled tab", <Tabs value="all" onValueChange={() => {}}><TabList aria-label="Views"><Tab value="all">All</Tab><Tab value="archived" disabled>Archived</Tab></TabList><TabPanel value="all">All rows</TabPanel><TabPanel value="archived">Archived rows</TabPanel></Tabs>],
];

describe("axe: no violations in rendered components", () => {
  for (const [name, el] of cases) {
    it(name, async () => {
      const { container } = render(el);
      const results = await axe.run(container, {
        rules: { "color-contrast": { enabled: false } }, // jsdom cannot compute; gated at token build instead
      });
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(", ")}`)).toEqual([]);
    });
  }
});

describe("a filter form's error line describes its control (D92)", () => {
  it("the Status select is described by the error text, in an align=start filter form", () => {
    const { getByRole, getByText } = render(
      <Toolbar as="form" align="start" gap={12} aria-label="Filters">
        <Field label="Device ID"><Input size={32} /></Field>
        <Field label="Status" error="Pick a status."><Select size={32}><option>Any</option></Select></Field>
        <Button type="submit" variant="accent" size={32}>Find</Button>
      </Toolbar>,
    );
    const status = getByRole("combobox", { name: "Status" });
    const describedBy = status.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(describedBy).toBe(getByText("Pick a status.").id);
    expect(status).toHaveAccessibleDescription("Pick a status.");
    expect(status).toHaveAttribute("aria-invalid", "true");
  });
});

describe("axe: the announcement region is a landmark (D90)", () => {
  // axe 4.12 reports a name on a role-less div as `incomplete` ("needs
  // review"), not as a violation, so asserting on `violations` alone could
  // never go red for this defect. Real-browser measurement is in the D90 spec.
  it("raises neither a violation nor a needs-review result for aria-prohibited-attr", async () => {
    const { container } = render(<ToastRegion><Toast variant="success">Transaction voided</Toast></ToastRegion>);
    // jsdom's popover UA stylesheet leaves the shown region `display: none`,
    // which axe skips; a real browser shows it. Show it, so axe looks.
    (container.firstElementChild as HTMLElement).style.display = "block";
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    const prohibited = [...results.violations, ...results.incomplete].filter((r) => r.id === "aria-prohibited-attr");
    expect(prohibited.map((r) => r.nodes.map((n) => n.html))).toEqual([]);
  });
});
