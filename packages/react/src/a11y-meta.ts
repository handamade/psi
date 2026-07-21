/**
 * Single-source keyboard/assistive-tech metadata, rendered into generated
 * docs (see scripts/emit-docs.ts). Every claim here is verified against the
 * component's implementation or an existing test assertion — see
 * docs/superpowers/task-7-report.md for the claim-by-claim evidence.
 */
export interface A11yEntry {
  keyboard: Array<{ keys: string; behavior: string }>;
  notes?: string;
}

export const a11yMeta: Record<string, A11yEntry> = {
  Button: {
    keyboard: [
      { keys: "Enter / Space", behavior: "Activates the button." },
      { keys: "Tab", behavior: "Focusable; visible focus ring via :focus-visible." },
    ],
    notes:
      "With href it renders an <a>; disabled anchors get aria-disabled, lose the href attribute, and suppress activation (D33).",
  },
  IconButton: {
    keyboard: [{ keys: "Enter / Space", behavior: "Activates." }],
    notes:
      "Requires an accessible name — pass aria-label. IconButton does not hide its icon for you; mark the icon aria-hidden yourself.",
  },
  Input: {
    keyboard: [{ keys: "Tab", behavior: "Focuses the native <input>; focus ring on the field." }],
    notes:
      "error sets a red border only. Inside a Field, aria-invalid and aria-describedby are wired automatically (D49); standalone, pair them yourself.",
  },
  Select: {
    keyboard: [
      { keys: "Tab", behavior: "Focuses the native <select>." },
      { keys: "Arrow keys / typeahead", behavior: "Native option navigation." },
    ],
    notes:
      "error: same contract as Input — sets a red border only. Inside a Field, aria-invalid and aria-describedby are wired automatically (D49); standalone, pair them yourself.",
  },
  Field: {
    keyboard: [
      { keys: "Tab", behavior: "Focus moves to the wrapped control; the label is announced with it." },
    ],
    notes:
      "Wires label association, aria-describedby and aria-invalid into a wrapped Input/Select automatically; the message line is aria-live=polite. Group mode renders fieldset/legend.",
  },
  Dialog: {
    keyboard: [
      { keys: "Esc", behavior: "Dismisses via onClose('esc') when dismissible; swallowed otherwise." },
      { keys: "Tab", behavior: "Focus is trapped inside by the native <dialog> top layer; restored on close." },
    ],
    notes:
      "Rendered with showModal(): aria-modal, inert background and focus restore come from the platform. title wires aria-labelledby; without title, pass aria-label. Backdrop click dismisses only when dismissible.",
  },
  Checkbox: {
    keyboard: [{ keys: "Space", behavior: "Toggles. Native <input type=checkbox> underneath (visually hidden)." }],
  },
  Switch: {
    keyboard: [{ keys: "Space", behavior: "Toggles. Native checkbox input with role=\"switch\"; announced as a switch, not a checkbox." }],
  },
  Tag: {
    keyboard: [{ keys: "Enter / Space (dismiss button)", behavior: "onDismiss renders a real <button>; keyboard-dismissible." }],
    notes: "Passive label otherwise; not in the tab order without onDismiss.",
  },
  Tooltip: {
    keyboard: [
      { keys: "Tab (focus trigger)", behavior: "Shows immediately on focus (no delay)." },
      { keys: "Escape", behavior: "Dismisses while visible (WCAG 1.4.13)." },
    ],
    notes:
      "Hover opens after a short delay; content is linked via aria-describedby while visible. Trigger must accept onMouseEnter/Leave and onFocus/Blur props (cloned in automatically) — no ref forwarding required.",
  },
  Panel: {
    keyboard: [
      { keys: "Tab", behavior: "Skipped — Panel itself is not focusable; focus moves through its children." },
    ],
    notes:
      "Plain <div> container with no implicit role. Pass aria-* host props if the panel should announce as a region.",
  },
};
