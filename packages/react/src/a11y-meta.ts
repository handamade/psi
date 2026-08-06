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
      "Rendered with showModal(): aria-modal, inert background and focus restore come from the platform. title wires aria-labelledby; without title, pass aria-label. Backdrop click dismisses only when dismissible. placement=\"inline-start\"/\"inline-end\" pins the panel full-height to that edge — that is Psi's drawer, and it changes nothing about modality, the focus trap, focus restore or the dismissal reasons (D66). A drawer's panel scrolls internally so a dismissible={false} footer stays reachable.",
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
  Toolbar: {
    keyboard: [
      { keys: "Tab", behavior: "Moves through the controls in DOM order — no roving tabindex (deliberately not role=toolbar, D52)." },
    ],
    notes:
      "With aria-label it renders role=group so the control cluster announces with a name; unlabeled it is a plain layout div.",
  },
  Menu: {
    keyboard: [
      { keys: "Arrow Down / Arrow Up", behavior: "Moves between enabled items, wrapping at both ends. Disabled items are skipped." },
      { keys: "Home / End", behavior: "Jumps to the first or last enabled item." },
      { keys: "Any single printable key", behavior: "Typeahead — focuses the first enabled item whose label starts with the typed prefix; the prefix resets after 500ms. Keystrokes with Meta/Ctrl/Alt held are ignored." },
      { keys: "Esc", behavior: "Suppresses the platform's own dismissal and reports onClose(\"esc\"); the menu stays open until the consumer flips `open` (D50)." },
      { keys: "Enter / Space", behavior: "Activates the focused item (native button behavior)." },
    ],
    notes:
      "Opens on the native top layer via popover=\"auto\", which supplies light dismiss. Controlled-only: every dismissal path (esc, item-select, outside) only reports onClose(reason) — the consumer must flip `open` to actually close it; outside is the one path the platform has already acted on by the time it is reported. Opening moves focus to the first enabled item — Menu takes focus off the trigger as soon as `open` becomes true. Focus returns to the trigger when the menu actually closes, and only if focus is still inside the menu, so a light dismiss onto another control does not steal focus back. Requires an accessible name — pass aria-label. Placement uses CSS anchor positioning where supported and a JS fallback below that floor; below it there is no collision flip.",
  },
  MenuItem: {
    keyboard: [{ keys: "Enter / Space", behavior: "Activates; Menu reports onClose(\"item-select\") but does not close itself." }],
    notes:
      "Renders a real <button>. disabled sets aria-disabled (not the disabled attribute) so the item stays discoverable to assistive tech while being skipped by roving navigation. variant=\"danger\" is for destructive actions only.",
  },
  MenuSeparator: {
    keyboard: [],
    notes: "Non-interactive rule with role=\"separator\" — exposed to assistive tech as a separator, never focusable, and skipped by roving navigation.",
  },
  Toast: {
    keyboard: [
      { keys: "Tab", behavior: "Reaches the action and the dismiss button in DOM order. Esc is not a dismissal — a toast is not modal and traps nothing." },
      { keys: "Enter / Space", behavior: "Activates the focused action or dismiss button." },
    ],
    notes:
      "Presentational and controlled (D64): onDismiss reports and the owner disposes; Toast never removes itself. It carries no role/aria-live of its own — politeness belongs to ToastRegion's two persistent wrappers. The variant's meaning is announced by a visually hidden status word (\"Success:\", \"Warning:\", \"Error:\"), never by colour and icon shape alone; the icon is aria-hidden. neutral has no status and gets no prefix. The dismiss button requires no props — it is labelled \"Dismiss notification\".",
  },
  ToastRegion: {
    keyboard: [
      { keys: "Tab", behavior: "Moves into the stacked toasts' controls in DOM order; the region itself is not focusable." },
    ],
    notes:
      "Renders two always-present live wrappers — role=\"status\"/aria-live=\"polite\" and role=\"alert\"/aria-live=\"assertive\" — and routes each toast into one by variant (neutral/success polite, warning/danger assertive). Both stay in the DOM when the queue is empty: a live region announces mutations to a subtree that already existed, so a wrapper mounting with its first toast would leave that toast unannounced. Sits on the native top layer via popover=\"manual\", so a toast raised from inside a modal Dialog is still painted above the backdrop and still announced — though showModal() makes everything outside the dialog inert, so it cannot be clicked until the dialog closes; manual (not auto) means no light dismiss, so the click that raised the toast cannot close it. The region is click-through (pointer-events: none) and each toast takes its own clicks back.",
  },
  ToastProvider: {
    keyboard: [
      { keys: "Tab", behavior: "Focus entering the region pauses every auto-dismiss timer; leaving resumes them." },
    ],
    notes:
      "Owns the queue, the auto-dismiss timers and the single ToastRegion (D65). Timers pause while the pointer or focus is inside the region and resume with the time remaining, satisfying WCAG 2.2.1 for content that disappears on a timer. Toasts carrying an action get a longer default lifetime, so the affordance cannot vanish before it is reached. useToast() throws outside a provider rather than silently no-opping.",
  },
  Tabs: {
    keyboard: [
      { keys: "Tab", behavior: "Enters the tab list at its selected tab (one stop for the whole list), then moves on to the active panel." },
    ],
    notes:
      "Controlled-only (D67): value and onValueChange are required and Tabs never selects itself. Tab and TabPanel pair by string value, not index, so their source order need not match. Every panel renders and unselected ones carry `hidden`, so aria-controls always resolves and panel DOM state survives a switch.",
  },
  TabList: {
    keyboard: [
      { keys: "Arrow Left / Arrow Right", behavior: "Horizontal orientation: moves to the previous/next enabled tab, wrapping at both ends. Selection follows focus (automatic activation)." },
      { keys: "Arrow Up / Arrow Down", behavior: "Vertical orientation: the same, on the block axis. The cross-axis arrows are ignored rather than swallowed." },
      { keys: "Home / End", behavior: "Jumps to the first or last enabled tab." },
    ],
    notes:
      "Renders role=\"tablist\" with aria-orientation. Requires an accessible name — pass aria-label, which is promoted onto its own props interface (D60) so the manifest shows it. Owns the roving tabindex: exactly one tab is in the page tab order at a time.",
  },
  Tab: {
    keyboard: [{ keys: "Enter / Space", behavior: "Activates (native button behavior); arrow keys already select on focus." }],
    notes:
      "Renders a real <button> with role=\"tab\", aria-selected and aria-controls. disabled sets aria-disabled (not the disabled attribute) so the tab stays discoverable to assistive tech while being skipped by roving navigation and refused for selection — the same choice MenuItem made in D53.",
  },
  TabPanel: {
    keyboard: [
      { keys: "Tab", behavior: "The panel itself is a tab stop (tabIndex=0), so a panel whose content has no focusable element is still reachable." },
    ],
    notes:
      "Renders role=\"tabpanel\" with aria-labelledby pointing back at its tab. Unselected panels stay in the DOM with `hidden`.",
  },
};
