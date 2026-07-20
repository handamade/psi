import { describe, expect, it } from "vitest";
import { renderPreset } from "./patterns.js";
import type { ManifestComponent, Pattern } from "./patterns.js";

// Fixture block copied from patterns.test.ts (per task-3 brief: reuse, don't import across test files).
const button: ManifestComponent = {
  name: "Button",
  slots: [],
  props: [
    { name: "variant", type: '"accent" | "ghost" | "danger"', required: false, default: "neutral" },
    { name: "size", type: "24 | 32 | 40 | 48", required: false, default: 32 },
    { name: "disabled", type: "boolean", required: false, default: false },
  ],
};
const dialog: ManifestComponent = {
  name: "Dialog",
  slots: [
    { name: "title", accepts: { contracts: ["inline-content"] }, cardinality: "0..1", order: 1 },
    { name: "body", accepts: {}, cardinality: "0..*", order: 2 },
    { name: "footer", accepts: { components: ["Button"] }, cardinality: "1..*", order: 3 },
  ],
  props: [],
};
const tag: ManifestComponent = { name: "Tag", slots: [], props: [] };
const components = [button, dialog, tag];

describe("renderPreset", () => {
  // Inlined from packages/react/patterns/destructive-confirm.json (per task-3 brief).
  const confirm: Pattern = {
    id: "destructive-confirm",
    intent: "Dialog confirming a destructive action",
    match: ["delete confirmation", "are you sure", "destructive dialog", "confirm delete"],
    compose: {
      component: "Dialog",
      slots: {
        title: ["{content:title}"],
        body: ["{content:consequence}"],
        footer: [
          { component: "Button", props: { variant: "ghost", size: "{param:size}" }, content: "cancel-label" },
          { component: "Button", props: { variant: "danger", size: "{param:size}" }, content: "confirm-label" },
        ],
      },
    },
    parameters: [{ key: "size", ask: "Button size?", options: [32, 40], default: 32 }],
    content: {
      title: "<Delete the object?>",
      consequence: "<what is permanently lost>",
      "cancel-label": "Cancel",
      "confirm-label": "<verb the object>",
    },
    gaps: [],
  };

  it("renders the fully-bound pattern deterministically", () => {
    const jsx = renderPreset(confirm, components);
    expect(jsx).toBe(
`<Dialog
  footer={<>
    <Button size={32} variant="ghost">Cancel</Button>
    <Button size={32} variant="danger"><verb the object></Button>
  </>}
  title="<Delete the object?>"
>
  <what is permanently lost>
</Dialog>
`);
  });
  it("re-render is byte-identical", () => {
    expect(renderPreset(confirm, components)).toBe(renderPreset(confirm, components));
  });
  it("returns null for gapped patterns and for defaultless parameters", () => {
    expect(renderPreset({ ...confirm, gaps: ["Toolbar"] }, components)).toBeNull();
    const noDefault: Pattern = { ...confirm, parameters: [{ key: "size", ask: "?", options: [32] }] };
    expect(renderPreset(noDefault, components)).toBeNull();
  });

  it('escapes " as &quot; in an attribute position, leaves it raw as a text child', () => {
    const withQuote: Pattern = {
      id: "quote-test",
      intent: "test",
      match: ["m"],
      compose: { component: "Button", props: { label: "{content:msg}" }, content: "msg" },
      parameters: [],
      content: { msg: 'Say "hi" now' },
      gaps: [],
    };
    expect(renderPreset(withQuote, components)).toBe(
      '<Button label="Say &quot;hi&quot; now">Say "hi" now</Button>\n',
    );
  });
});
