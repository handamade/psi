import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import {
  Button, IconButton, Card, Panel, NavBar, AspectRatio, Field, Dialog, Input, Select, Checkbox, Switch, Tag, Tooltip, Toolbar,
  Menu, MenuItem, MenuSeparator,
  Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, Pagination,
  Toast, ToastRegion,
} from "./index.js";

const cases: Array<[string, React.ReactElement]> = [
  ["Button", <Button>Save</Button>],
  ["Button as disabled anchor", <Button href="/x" disabled>Link</Button>],
  ["IconButton", <IconButton aria-label="Close"><svg aria-hidden="true" /></IconButton>],
  ["Card", <Card variant="stacked" media={<img alt="" src="x.png" />}>Body</Card>],
  ["Panel", <Panel><h3>Usage</h3><p>Elevated surface body.</p></Panel>],
  ["NavBar", <NavBar brand={<a href="/">DK</a>} actions={<Button size={32}>CTA</Button>}><a href="/a">A</a></NavBar>],
  ["AspectRatio", <AspectRatio ratio={16 / 10}><img alt="demo" src="x.png" /></AspectRatio>],
  ["Input", <label>Name<Input size={32} /></label>],
  ["Input error", <label>Email<Input size={32} error aria-invalid="true" /></label>],
  ["Select", <label>Plan<Select size={32}><option>Free</option></Select></label>],
  ["Field with Input", <Field label="Email" description="We never share it."><Input size={40} /></Field>],
  ["Field error", <Field label="Email" error="Invalid email." required><Input size={40} /></Field>],
  ["Field group", <Field group label="Notifications" description="Pick channels."><Checkbox>Email</Checkbox><Switch>Push</Switch></Field>],
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
  ["Pagination", <Pagination page={4} pageCount={13} onPageChange={() => {}} />],
  ["Pagination single page", <Pagination page={1} pageCount={1} onPageChange={() => {}} />],
  ["Toast in a region", <ToastRegion><Toast variant="success">Transaction voided</Toast></ToastRegion>],
  ["Toast danger routes assertive", <ToastRegion><Toast variant="danger">Could not void the transaction</Toast></ToastRegion>],
  ["Toast with action and dismiss", <ToastRegion><Toast variant="success" action={<Button variant="ghost" size={32}>Undo</Button>} onDismiss={() => {}}>Transaction voided</Toast></ToastRegion>],
  ["Toast region empty", <ToastRegion>{null}</ToastRegion>],
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
