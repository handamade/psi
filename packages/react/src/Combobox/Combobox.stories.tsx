import React, { useEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "storybook";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Combobox } from "./Combobox.js";
import type { ComboboxOption } from "./types.js";
import { Field } from "../Field/Field.js";
import { Toolbar } from "../Toolbar/Toolbar.js";
import { Button } from "../Button/Button.js";
import { Dialog } from "../Dialog/Dialog.js";

const meta: Meta<typeof Combobox> = {
  title: "Components/Combobox",
  component: Combobox,
};
export default meta;

type Story = StoryObj<typeof Combobox>;

const cities: ComboboxOption[] = [
  { value: "ams", label: "Amsterdam", description: "Netherlands" },
  { value: "ber", label: "Berlin", description: "Germany" },
  { value: "bru", label: "Brussels", description: "Belgium", disabled: true },
  { value: "cph", label: "Copenhagen", description: "Denmark" },
  { value: "lis", label: "Lisbon", description: "Portugal" },
  { value: "osl", label: "Oslo", description: "Norway" },
  { value: "vie", label: "Vienna", description: "Austria" },
  { value: "zrh", label: "Zürich", description: "Switzerland" },
];

const plain: ComboboxOption[] = cities.map(({ value, label }) => ({ value, label }));

const many: ComboboxOption[] = Array.from({ length: 40 }, (_, i) => ({
  value: `item-${i + 1}`,
  label: `Item ${i + 1}`,
}));

/** The VR runner opens a list only under its `vr` global, like Tooltip's
 * bubbles (HAN-39): in the canvas and on the docs page every story starts
 * closed, as in an app. Stories named Open… are the ones stories.spec.ts
 * waits on. With `text`, it types; otherwise Arrow Down opens the list. */
function openList(text?: string): Story["play"] {
  return async ({ canvasElement, globals }) => {
    if (!globals.vr) return;
    // The document, not the canvas: a Dialog renders outside it. Wait for
    // the input to be accessible: the play can run before a Dialog's
    // showModal(), while its content is still hidden.
    const doc = canvasElement.ownerDocument;
    const input = (await within(doc.body).findAllByRole("combobox"))[0];
    input.focus();
    if (text) await userEvent.type(input, text);
    else await userEvent.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(doc.querySelector("[data-psi-combobox-popup]")!.matches(":popover-open")).toBe(true),
    );
  };
}

const column = (width: number, children: React.ReactNode) => (
  <div style={{ inlineSize: width, display: "grid", gap: "var(--psi-space-16)" }}>{children}</div>
);

// ── Closed states ──────────────────────────────────────────────────

export const Default: Story = {
  render: () => column(320, <Combobox options={cities} aria-label="City" placeholder="Search cities" />),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 280px)", alignItems: "start", gap: "var(--psi-space-16)" }}>
      {([24, 32, 40, 48] as const).map((size) => (
        <Combobox key={size} size={size} options={plain} aria-label={`City ${size}`} defaultValue="ber" />
      ))}
      <div />
      {([32, 40, 48] as const).map((size) => (
        <Combobox key={`m${size}`} multiple size={size} options={plain} aria-label={`Cities ${size}`} defaultValue={["ams", "osl"]} />
      ))}
    </div>
  ),
};

/** Picked values wrap inside the control's border, which grows from its
 * 32px height. */
export const Multiple: Story = {
  render: () =>
    column(
      320,
      <>
        <Combobox multiple options={plain} aria-label="Cities" placeholder="Add cities" />
        <Combobox multiple options={plain} aria-label="Cities" defaultValue={["ams", "ber", "cph", "lis", "vie", "zrh"]} />
      </>,
    ),
};

export const Clearable: Story = {
  render: () =>
    column(
      320,
      <>
        <Combobox clearable options={plain} aria-label="City" defaultValue="lis" />
        <Combobox clearable multiple options={plain} aria-label="Cities" defaultValue={["ams", "osl"]} />
      </>,
    ),
};

export const ErrorAndDisabled: Story = {
  render: () =>
    column(
      320,
      <>
        <Combobox error options={plain} aria-label="City" defaultValue="ber" />
        <Combobox disabled options={plain} aria-label="City" defaultValue="ber" />
        <Combobox disabled multiple options={plain} aria-label="Cities" defaultValue={["ams", "osl"]} />
      </>,
    ),
};

/** A Field wires the label, description, error and required; controlWidth
 * (D125) sizes the Combobox like any Field control. */
export const InField: Story = {
  render: () =>
    column(
      560,
      <>
        <Field label="City" description="Where the order ships from." controlWidth={240}>
          <Combobox options={cities} />
        </Field>
        <Field label="Cities" error="Pick at least one city." required controlWidth={320}>
          <Combobox multiple options={plain} />
        </Field>
      </>,
    ),
};

/** A bare Combobox takes --psi-toolbar-control-width, as a bare input or
 * select does (D77). */
export const InToolbar: Story = {
  render: () => (
    <Toolbar aria-label="Filters">
      <Combobox options={plain} aria-label="City" placeholder="City" />
      <Button size={32}>Apply</Button>
    </Toolbar>
  ),
};

/** The chevron and the clear button sit at inline-end: the left, in right
 * to left. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      {column(
        320,
        <>
          <Combobox clearable options={plain} aria-label="City" defaultValue="ber" />
          <Combobox clearable multiple options={plain} aria-label="Cities" defaultValue={["ams", "osl"]} />
        </>,
      )}
    </div>
  ),
};

/** `filter={false}` hands the list to the caller: here a pretend server
 * that answers after 400ms and returns at most five matches, with a "more"
 * line for a cut-off list. While a read is in flight the last options stay
 * on screen and the listbox is aria-busy. */
export const CallerOwned: Story = {
  render: function CallerOwnedStory() {
    const [text, setText] = useState("");
    const [results, setResults] = useState<ComboboxOption[]>(many.slice(0, 5));
    const [loading, setLoading] = useState(false);
    const [value, setValue] = useState<string | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    const total = many.filter((o) => o.label.toLowerCase().includes(text.toLowerCase())).length;
    return column(
      320,
      <Combobox
        options={results}
        filter={false}
        loading={loading}
        value={value}
        onChange={setValue}
        inputValue={text}
        onInputChange={(next) => {
          setText(next);
          setLoading(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            setResults(many.filter((o) => o.label.toLowerCase().includes(next.toLowerCase())).slice(0, 5));
            setLoading(false);
          }, 400);
        }}
        moreMessage={total > 5 ? `Showing 5 of ${total}. Keep typing to narrow it.` : undefined}
        aria-label="Item"
        placeholder="Search items"
      />,
    );
  },
};

/** Enter on a highlighted option picks it and doesn't submit the form. */
export const InForm: Story = {
  render: function InFormStory() {
    const [submits, setSubmits] = useState(0);
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmits((n) => n + 1);
        }}
        style={{ display: "grid", gap: "var(--psi-space-16)", inlineSize: 320 }}
      >
        <Field label="City">
          <Combobox options={plain} name="city" />
        </Field>
        <Button size={32} type="submit">Save</Button>
        <output data-testid="submits">{submits}</output>
      </form>
    );
  },
};

/** `valueLabel` (D134) names a preset value the caller-owned list doesn't
 * hold yet: here item 37, past the first page of five. Opening the list
 * shows the first page; Esc and blur keep "Item 37". */
export const PresetLabel: Story = {
  render: () =>
    column(
      320,
      <Field label="Item">
        <Combobox
          options={many.slice(0, 5)}
          filter={false}
          defaultValue="item-37"
          valueLabel="Item 37"
          name="item"
          moreMessage="Showing 5 of 40. Keep typing to narrow it."
        />
      </Field>,
    ),
};

/** A caller-held open state (D134): while the read has failed, the caller
 * passes `open={false}` and shows the error in the Field, so typing, the
 * arrow keys and the chevron open nothing. Esc restores the picked label and
 * Enter settles the text without submitting. "Try again" hands the list
 * back. */
export const ReadFailed: Story = {
  render: function ReadFailedStory() {
    const [failed, setFailed] = useState(true);
    const [open, setOpen] = useState(false);
    const [submits, setSubmits] = useState(0);
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmits((n) => n + 1);
        }}
        style={{ display: "grid", gap: "var(--psi-space-16)", inlineSize: 320, justifyItems: "start" }}
      >
        <Field label="City" error={failed ? "Couldn't load the cities." : undefined}>
          <Combobox
            options={failed ? [] : plain}
            defaultValue="ber"
            valueLabel="Berlin"
            name="city"
            open={failed ? false : open}
            // Drop the requests made while the read is failed: stored, they
            // would open the list by itself the moment the hold ends.
            onOpenChange={(next) => {
              if (!failed) setOpen(next);
            }}
          />
        </Field>
        <Button size={32} type="button" onClick={() => setFailed(false)}>Try again</Button>
        <output data-testid="submits" hidden>{submits}</output>
      </form>
    );
  },
};

// ── Open states (opened under vr) ──────────────────────────────────

export const OpenSingle: Story = {
  render: () => column(320, <Combobox options={cities} aria-label="City" defaultValue="cph" />),
  play: openList(),
};

export const OpenMultiple: Story = {
  render: () => column(320, <Combobox multiple options={cities} aria-label="Cities" defaultValue={["ams", "lis", "vie"]} />),
  play: openList(),
};

export const OpenLoading: Story = {
  render: () => column(320, <Combobox options={plain.slice(0, 4)} filter={false} loading aria-label="City" />),
  play: openList(),
};

export const OpenNoMatches: Story = {
  render: () => column(320, <Combobox options={plain} aria-label="City" />),
  play: openList("qq"),
};

export const OpenMore: Story = {
  render: () =>
    column(
      320,
      <Combobox
        options={many.slice(0, 5)}
        filter={false}
        moreMessage="Showing 5 of 812. Keep typing to narrow it."
        aria-label="Item"
      />,
    ),
  play: openList(),
};

/** Past --psi-combobox-popup-max-height (the shared 320px popup cap) the
 * list scrolls, keeping the highlighted option in view. */
export const OpenLongList: Story = {
  render: () => column(320, <Combobox options={many} aria-label="Item" />),
  play: openList(),
};

export const OpenInField: Story = {
  render: () =>
    column(
      560,
      <Field label="City" controlWidth={240}>
        <Combobox options={cities} />
      </Field>,
    ),
  play: openList(),
};

export const OpenRightToLeft: Story = {
  render: () => <div dir="rtl">{column(320, <Combobox clearable options={cities} aria-label="City" defaultValue="ber" />)}</div>,
  play: openList(),
};

/** The popup is on the top layer, so it draws above a modal Dialog. Esc in
 * the Combobox closes only the list; the next Esc reaches the Dialog. */
export const OpenInDialog: Story = {
  render: function OpenInDialogStory() {
    const [open, setOpen] = useState(true);
    const [reason, setReason] = useState("none");
    return (
      <>
        <output data-testid="dialog-close">{reason}</output>
        <Dialog
          open={open}
          onClose={(r) => {
            setReason(r);
            setOpen(false);
          }}
          title="Ship an order"
          width={400}
        >
          <Field label="City">
            <Combobox options={cities} />
          </Field>
        </Dialog>
      </>
    );
  },
  play: openList(),
};
