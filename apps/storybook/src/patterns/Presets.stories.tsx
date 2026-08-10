// GENERATED FILE — do not hand-edit. Run `tsx scripts/emit-pattern-stories.ts`
// (part of `pnpm build`) to regenerate. One story per packages/react
// patterns.json entry (D77) — every pattern is mounted from a real,
// registered component tree via renderPresetElement, not a hand-copied
// approximation of one, so a pattern's JSON and its story cannot drift
// apart and a new 14th pattern gets a story with no hand-authoring.

import type { Meta, StoryObj } from "storybook";
import * as Psi from "../../../../packages/react/src/index.js";
import { renderPresetElement } from "../../../../packages/react/scripts/patterns.js";
import patternsFile from "@handamade/psi-react/patterns.json";
import manifestFile from "@handamade/psi-react/manifest.json";

const meta: Meta = {
  title: "Patterns/Presets",
};
export default meta;
type Story = StoryObj;

function preset(id: string) {
  const pattern = patternsFile.patterns.find((p) => p.id === id);
  if (!pattern) throw new Error(`emit-pattern-stories: no pattern "${id}" in patterns.json`);
  return () => renderPresetElement(pattern as any, manifestFile.components as any, Psi as any);
}

export const ActionFeedback: Story = {
  render: preset("action-feedback"),
};

export const BulkActionBar: Story = {
  render: preset("bulk-action-bar"),
};

export const DataTable: Story = {
  render: preset("data-table"),
};

export const DateRangeFilter: Story = {
  render: preset("date-range-filter"),
};

export const DestructiveConfirm: Story = {
  render: preset("destructive-confirm"),
};

export const DetailDrawer: Story = {
  render: preset("detail-drawer"),
};

export const EmptyState: Story = {
  render: preset("empty-state"),
};

export const FilterToolbar: Story = {
  render: preset("filter-toolbar"),
};

export const RowActions: Story = {
  render: preset("row-actions"),
};

export const SettingsFormRow: Story = {
  render: preset("settings-form-row"),
};

export const SummaryTiles: Story = {
  render: preset("summary-tiles"),
};

export const TabbedWorkspace: Story = {
  render: preset("tabbed-workspace"),
};

export const TablePagination: Story = {
  render: preset("table-pagination"),
};
