import type { Meta, StoryObj } from "storybook";
// D146: web.css sets global element rules (a, hr, code, kbd), so only this file imports it.
import "@ui-sdk/core/web.css";
import "@handamade/psi-tokens/ui-sdk.css";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { Checkbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { Slider, SliderControl, SliderTrack, SliderIndicator, SliderThumb } from "@ui-sdk/react/slider";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import {
  Calendar, CalendarDay, CalendarGrid, CalendarHeading, CalendarNext, CalendarPrevious,
  CalendarWeekday, CalendarWeekdays, CalendarWeeks,
} from "@ui-sdk/react/calendar";

const meta: Meta = { title: "Integrations/UI SDK", parameters: { layout: "fullscreen" } };
export default meta;

const THEMES = ["light", "dark", "acme", "ember"] as const;

function Sample({ theme }: { theme: string }) {
  return (
    <section data-psi-theme={theme} style={{ display: "grid", gap: "var(--psi-space-16)", padding: "var(--psi-space-24)", background: "var(--psi-bg-primary)", color: "var(--psi-fg-primary)" }}>
      <strong>{theme}</strong>
      <label data-slot="label">Airplane mode <Switch defaultChecked><SwitchThumb /></Switch></label>
      <label data-slot="label"><Checkbox defaultChecked><CheckboxIndicator /></Checkbox> Accept terms</label>
      <Slider defaultValue={50}>
        <SliderControl><SliderTrack><SliderIndicator /><SliderThumb aria-label={`Volume, ${theme}`} /></SliderTrack></SliderControl>
      </Slider>
      <Select placeholder="Select a role" defaultValue="editor">
        <SelectLabel>Role</SelectLabel>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="viewer">Viewer</SelectItem>
          <SelectItem value="editor">Editor</SelectItem>
        </SelectContent>
      </Select>
      {/* today is pinned, so the baseline does not move with the date. */}
      <Calendar today="2026-10-16" defaultValue="2026-10-14">
        <div data-slot="row">
          <CalendarPrevious data-variant="ghost" aria-label="Previous month">‹</CalendarPrevious>
          <CalendarHeading />
          <CalendarNext data-variant="ghost" aria-label="Next month">›</CalendarNext>
        </div>
        <CalendarGrid>
          <CalendarWeekdays>{(i) => <CalendarWeekday index={i} />}</CalendarWeekdays>
          <CalendarWeeks>{(cell) => <CalendarDay value={cell.date} />}</CalendarWeeks>
        </CalendarGrid>
      </Calendar>
    </section>
  );
}

export const AllThemes: StoryObj = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
      {THEMES.map((t) => <Sample key={t} theme={t} />)}
    </div>
  ),
};

/** The open Select, light theme only: four open popups would overlap. */
export const SelectOpen: StoryObj = {
  render: () => (
    <section data-psi-theme="light" style={{ padding: "var(--psi-space-24)", minHeight: "16rem" }}>
      <Select defaultOpen defaultValue="editor">
        <SelectLabel>Role</SelectLabel>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="viewer">Viewer</SelectItem>
          <SelectItem value="editor">Editor</SelectItem>
        </SelectContent>
      </Select>
    </section>
  ),
};
