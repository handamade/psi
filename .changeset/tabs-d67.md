---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

Tabs — the coverage arc's last gap (D67)

Adds `Tabs`, `TabList`, `Tab` and `TabPanel`, closing `tabbed-workspace`.
**Every composition pattern now composes only components that exist.**

```tsx
<Tabs value={view} onValueChange={setView} orientation="horizontal">
  <TabList aria-label="Saved views">
    <Tab value="all">All</Tab>
    <Tab value="flagged">Flagged</Tab>
  </TabList>
  <TabPanel value="all">…</TabPanel>
  <TabPanel value="flagged">…</TabPanel>
</Tabs>
```

- **Controlled-only**, per D50/D53/D62: `value` and `onValueChange` are
  required, there is no `defaultValue`, and Tabs never selects itself.
- **Values are strings, not indices** — an index breaks the moment a tab is
  inserted. `Tab` and `TabPanel` pair by value, so source order need not match.
- **Automatic activation**: arrow keys move focus and selection together, along
  the orientation's axis, with wrap. Home/End jump to the first/last enabled
  tab. Disabled tabs are skipped and use `aria-disabled`, so they stay
  discoverable. There is no manual-activation mode.
- **Every panel renders; unselected ones get `hidden`**, so `aria-controls`
  always resolves and panel DOM state survives a switch. For an expensive
  panel, render less *inside* it rather than omitting the `TabPanel`.
- `TabList` owns the roving tabindex — the whole list is one tab stop, and
  `Tab` from it lands on the active panel.

New `--psi-tabs-*` tokens aliasing the semantic layer and the D54/D55 control
ramp. No new contrast pairs.

Also widens the D46 `border` scope group to accept the logical longhands
(`border-inline-start` and siblings). The group already carried every physical
longhand and both logical shorthands, so their absence was an omission — and
the logical form is the one that survives RTL. Found by the gate itself.
