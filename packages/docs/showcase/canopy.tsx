import { useLayoutEffect, useRef, useState } from "react";
import {
  AppShell, Button, Count, Dialog, IconButton, IconMenu, Input, NavBar, NavItem, NavTree, PageHeading, Select,
  Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow, Tag, Text,
  ToastProvider, Toolbar, useToast,
} from "@handamade/psi-react";

const ZONES = [
  { id: "A", name: "A · Tomatoes", status: "Healthy", moisture: 62, temp: 23.4, on: false },
  { id: "B", name: "B · Basil", status: "Dry", moisture: 18, temp: 26.1, on: false },
  { id: "C", name: "C · Seedlings", status: "Healthy", moisture: 55, temp: 21.8, on: true },
  { id: "D", name: "D · Orchids", status: "Offline", moisture: null, temp: null, on: false },
] as const;
const TONE = { Healthy: "success", Dry: "warning", Offline: "neutral" } as const;

/** breakpoints.sm (D31): below this width of its own, Canopy is a list. */
const NARROW = 560;

function useOwnWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(Infinity);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function Zones() {
  const toast = useToast();
  const [on, setOn] = useState<Record<string, boolean>>(Object.fromEntries(ZONES.map((z) => [z.id, z.on])));
  const [ref, width] = useOwnWidth<HTMLDivElement>();
  const [navOpen, setNavOpen] = useState(false);
  const narrow = width < NARROW;

  const toggle = (id: string, name: string) => {
    const next = !on[id];
    setOn({ ...on, [id]: next });
    toast.show({ message: `${next ? "Watering on" : "Watering off"}: ${name}` });
  };

  const nav = (
    <NavTree aria-label="Canopy">
      <NavItem href="#overview">Overview</NavItem>
      <NavItem href="#zones" current count={<Count value={ZONES.length} />}>Zones</NavItem>
      <NavItem href="#alerts" count={<Count value={2} tone="attention" label="2 alerts" />}>Alerts</NavItem>
      <NavItem href="#schedules">Schedules</NavItem>
    </NavTree>
  );
  const fmt = (n: number | null, unit: string) => (n == null ? "—" : `${n} ${unit}`);

  return (
    <div ref={ref}>
      <AppShell
        header={
          <NavBar
            fluid
            navLabel="Canopy"
            brand={<Text as="span" weight="medium">Canopy</Text>}
            actions={narrow ? <IconButton size={32} variant="ghost" aria-label="Open navigation" onClick={() => setNavOpen(true)}><IconMenu /></IconButton> : undefined}
          />
        }
        sidebar={narrow ? undefined : nav}
        sidebarOpen={!narrow}
      >
        <Stack gap={16}>
          <PageHeading>Zones</PageHeading>
          <Text tone="secondary">North house · {ZONES.length} zones · updated 2 min ago</Text>
          <Toolbar>
            <Input type="search" aria-label="Search zones" placeholder="Search zones…" />
            <Select aria-label="House"><option>All houses</option><option>North</option></Select>
            <Button variant="accent">Add zone</Button>
          </Toolbar>
          {narrow ? (
            <Stack gap={12}>
              {ZONES.map((z) => (
                <Toolbar key={z.id} align="center">
                  <Stack gap={4}>
                    <Text weight="medium">{z.name} <Tag variant={TONE[z.status]} subtle>{z.status}</Tag></Text>
                    <Text tone="secondary">{z.moisture == null ? "no reading" : `${z.moisture} % · ${z.temp} °C`}</Text>
                  </Stack>
                  <Switch aria-label={`Watering, ${z.name}`} checked={on[z.id]} onChange={() => toggle(z.id, z.name)} />
                </Toolbar>
              ))}
            </Stack>
          ) : (
            <TableContainer aria-label="Zones">
              <Table>
                <TableHead><TableRow>
                  <TableHeaderCell>Zone</TableHeaderCell><TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell numeric>Moisture</TableHeaderCell><TableHeaderCell numeric>Temp</TableHeaderCell>
                  <TableHeaderCell>Watering</TableHeaderCell>
                </TableRow></TableHead>
                <TableBody>
                  {ZONES.map((z) => (
                    <TableRow key={z.id}>
                      <TableCell>{z.name}</TableCell>
                      <TableCell><Tag variant={TONE[z.status]} subtle>{z.status}</Tag></TableCell>
                      <TableCell numeric>{fmt(z.moisture, "%")}</TableCell>
                      <TableCell numeric>{fmt(z.temp, "°C")}</TableCell>
                      <TableCell><Switch aria-label={`Watering, ${z.name}`} checked={on[z.id]} onChange={() => toggle(z.id, z.name)} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </AppShell>
      <Dialog open={navOpen} onClose={() => setNavOpen(false)} placement="inline-start" width={400} title="Canopy">{nav}</Dialog>
    </div>
  );
}

export default function Canopy() {
  return (
    <ToastProvider placement="bottom-end">
      <Zones />
    </ToastProvider>
  );
}
