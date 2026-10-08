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
      "Wires label association, aria-describedby and aria-invalid into a wrapped Input/Select automatically; the message line is aria-live=polite. Group mode renders fieldset/legend. required marks the label with an aria-hidden asterisk and flows required to the control; requiredText replaces the asterisk with a visible word such as \"(Required)\", also aria-hidden, because the control's required/aria-required is what assistive tech reads (D84). A control Psi did not write joins the same wiring through useFieldControl(): spread its result — id, aria-labelledby (a label-for names only a labelable element, and a custom control is usually not one), aria-describedby, aria-invalid, aria-required, required, each present only when the Field sets it — onto the element that takes focus (D84).",
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
  TableCaption: {
    keyboard: [
      { keys: "Tab", behavior: "Not a tab stop. With tabIndex={-1} the consumer moves focus to it after a page change, and the shared ring is drawn inside the caption." },
    ],
    notes:
      "Renders <caption>, which names the table for assistive tech and is visible, unlike an aria-label on Table. Put the range in `detail` (\"Rows 51–100 of more than 100,000\") so that moving focus to the caption after a token-paged page change reads the new range (D85). Remaining attributes land on the element.",
  },
  CursorPagination: {
    keyboard: [
      { keys: "Tab", behavior: "Reaches the Previous and Next buttons in order; a disabled direction is skipped." },
      { keys: "Enter / Space", behavior: "Activates the focused button (native button behavior)." },
    ],
    notes:
      "A <nav> named \"Pagination\" (override with aria-label) holding two ghost Buttons with visible words — Previous and Next, translatable through previousLabel/nextLabel — each with a chevron that only reinforces the word (D85). A direction that is unavailable is disabled, not hidden. It holds no state: the consumer holds the page tokens and answers hasPrevious/hasNext. Pair it with a TableCaption whose detail states the range, and move focus there after a page change.",
  },
  Toast: {
    keyboard: [
      { keys: "Tab", behavior: "Reaches the action and the dismiss button in DOM order. Esc is not a dismissal — a toast is not modal and traps nothing." },
      { keys: "Enter / Space", behavior: "Activates the focused action or dismiss button." },
    ],
    notes:
      "Presentational and controlled (D64): onDismiss reports and the owner disposes; Toast never removes itself. It carries no role/aria-live of its own — politeness belongs to ToastRegion's two persistent wrappers. The variant's meaning is announced by a visually hidden status word (\"Success:\", \"Warning:\", \"Error:\"), never by colour and icon shape alone; the icon is aria-hidden. neutral has no status and gets no prefix. statusLabel replaces that word with a translated one, or drops it with null (D83). politeness tells ToastRegion which wrapper speaks the toast; unset, the variant decides. The dismiss button requires no props — it is labelled \"Dismiss notification\".",
  },
  ToastRegion: {
    keyboard: [
      { keys: "Tab", behavior: "Moves into the stacked toasts' controls in DOM order; the region itself is not focusable." },
    ],
    notes:
      "Is itself a role=\"region\" landmark named by aria-label (default \"Notifications\"; a caller's role never replaces it, D90), and renders two always-present live wrappers — role=\"status\"/aria-live=\"polite\" and role=\"alert\"/aria-live=\"assertive\", both aria-atomic=\"false\" so a screen reader speaks only the message that was added, not what is already there (D90) — and routes each child into one. A Toast or an Announcement that names its politeness goes where it says (D83); a Toast that names none is routed by variant (neutral/success polite, warning/danger assertive). Whatever it holds, the region contains exactly two live regions. Remaining HTML attributes, data-* included, land on the root element, so it can be marked data-react-aria-top-layer and stay exposed while a React Aria overlay is open. Both stay in the DOM when the queue is empty: a live region announces mutations to a subtree that already existed, so a wrapper mounting with its first toast would leave that toast unannounced. Sits on the native top layer via popover=\"manual\", so a toast raised from inside a modal Dialog is still painted above the backdrop and still announced — though showModal() makes everything outside the dialog inert, so it cannot be clicked until the dialog closes; manual (not auto) means no light dismiss, so the click that raised the toast cannot close it. The region is click-through (pointer-events: none) and each toast takes its own clicks back.",
  },
  ToastProvider: {
    keyboard: [
      { keys: "Tab", behavior: "Focus entering the region pauses every auto-dismiss timer; leaving resumes them." },
    ],
    notes:
      "Owns the queue, the auto-dismiss timers and the single ToastRegion (D65). Timers pause while the pointer or focus is inside the region and resume with the time remaining, satisfying WCAG 2.2.1 for content that disappears on a timer. Toasts carrying an action get a longer default lifetime, so the affordance cannot vanish before it is reached. useToast() throws outside a provider rather than silently no-opping. announce(message, { politeness }) speaks through the same region without showing anything (D91): it renders an Announcement into the wrapper its politeness names (default polite), never a live region of its own, so the application keeps one announcer. An announcement leaves after a one-second dwell, is not removed early by a later one, and never counts against limit, so it cannot evict a visible toast. Its timer pauses with the region and is disposed by dismiss, clear() and unmount like a toast's. Remaining props (aria-label, ref, className, data-* such as data-react-aria-top-layer) are forwarded to the region element.",
  },
  Announcement: {
    keyboard: [],
    notes:
      "Not a live region: it renders no role and no aria-live, and outside a ToastRegion it announces nothing. It is visually hidden text that ToastRegion places in its polite or assertive wrapper, by the politeness prop (default polite) — for an event that must be spoken and has nothing to show. Keep one ToastRegion as the application's only announcer and put every Announcement inside it; never use an Announcement as a second one. Rendered by useToast().announce() (D91), it gets a lifetime: it leaves after a one-second dwell, a later announcement does not remove it early, and it never counts against the toast limit. Rendered by hand it is controlled like Toast and never removes itself — remove it after the same one-second dwell, not before. To announce the same text again, remove it and render it again with a new key — a live region speaks changes, and an unchanged node is not one. Not focusable, and it takes no space in the toast stack.",
  },
  Banner: {
    keyboard: [
      { keys: "Tab", behavior: "Reaches the action and the dismiss button, in that order, when present. The banner itself is not focusable." },
      { keys: "Enter / Space", behavior: "Activates the focused action or the dismiss button." },
    ],
    notes:
      "Not a live region: it renders no role and no aria-live, so mounting a Banner announces nothing; announcing stays the application's (route the same event through a ToastRegion or an Announcement if it must be spoken). Presentational and controlled (D86): onDismiss reports and the owner disposes; Banner never removes itself. The variant's meaning is carried by a visually hidden status word (\"Success:\", \"Warning:\", \"Error:\"), never by colour and icon shape alone; the icon is aria-hidden. neutral has no status and gets no word. statusLabel replaces that word with a translated one, or drops it with null (D83). The dismiss button is labelled \"Dismiss\". Put it first in the page content so it is met before the content it qualifies.",
  },
  InlineAlert: {
    keyboard: [
      { keys: "Tab", behavior: "Reaches the action when present. The alert itself is not focusable." },
      { keys: "Enter / Space", behavior: "Activates the focused action." },
    ],
    notes:
      "Not a live region, and not role=\"alert\" despite its name: it renders no role and no aria-live, so mounting an InlineAlert announces nothing; announcing stays the application's (route the same event through a ToastRegion or an Announcement if it must be spoken). Presentational (D86): it holds no state and has no dismiss button. The variant's meaning is carried by a visually hidden status word (\"Success:\", \"Warning:\", \"Error:\"), never by colour, border and icon shape alone; the icon is aria-hidden. neutral has no status and gets no word. statusLabel replaces that word with a translated one, or drops it with null (D83). Place it in reading order before the content it qualifies, such as above the form it is about.",
  },
  Skeleton: {
    keyboard: [],
    notes:
      "Not a live region: it renders no role and no aria-live, and it is always aria-hidden=\"true\", so assistive tech skips it entirely. Put aria-busy=\"true\" on the region the skeleton stands for (a table body, a card, a list) and remove it when the content arrives; that, not the skeleton, is what tells a screen reader the content is loading. Not focusable. The pulse is an opacity animation that stops under prefers-reduced-motion: reduce, because zeroing the duration of an infinite alternating animation flickers instead of stopping (D86).",
  },
  CopyButton: {
    keyboard: [
      { keys: "Enter / Space", behavior: "Copies the value to the clipboard." },
    ],
    notes:
      "Not a live region: it renders no role and no aria-live, announces nothing, and does not change its label or icon after a copy, so a screen reader hears the same button before and after. The application speaks the result: onCopy reports \"copied\" or \"failed\" (a rejected write, or no clipboard API), and the application routes that through its announcer or a Toast (D86). The label is visible text; the icon is aria-hidden and only reinforces it. Focus stays on the button.",
  },
  SkipLink: {
    keyboard: [
      { keys: "Tab", behavior: "Takes focus and becomes visible at the inline-start top corner, drawing the shared focus ring. Put it first in the document so it is the first tab stop." },
      { keys: "Enter", behavior: "Follows the fragment href: focus moves to the target, and the next Tab continues from inside it." },
    ],
    notes:
      "A native anchor, visually hidden until it is focused (:focus-visible) and with no script (D88). Fragment navigation moves focus only to a focusable target, so the element named by href must be focusable: tabIndex={-1} is enough, and AppShell's main has it. A modal Dialog makes the link inert, so it never needs to beat one. A ToastRegion is on the native top layer and paints over the focused link whatever its z-index: do not place one at top-start in an app with a skip link.",
  },
  NavTree: {
    keyboard: [
      { keys: "Tab / Shift+Tab", behavior: "Moves through the group buttons and the links of open groups in document order. There is no roving focus and no arrow-key model: it is a list of links, not a menu or a tree widget." },
    ],
    notes:
      "A native <nav> around a <ul>, named by the required aria-label (an app has more than one navigation landmark). No role=\"menu\" or role=\"tree\" is used (D88). Router-agnostic: the consumer passes its router's link inside each NavItem.",
  },
  NavGroup: {
    keyboard: [
      { keys: "Enter / Space", behavior: "Activates the group's native button, which asks the parent to open or close the group through onOpenChange." },
    ],
    notes:
      "Controlled-only: open and onOpenChange are required and the group never changes its own state. Renders a <button type=\"button\"> with aria-expanded and aria-controls naming its <ul>, which carries `hidden` when closed, so the links leave the layout and the accessibility tree while aria-controls still resolves. The chevron is aria-hidden and turns on a duration token; the label and aria-expanded carry the meaning.",
  },
  NavItem: {
    keyboard: [
      { keys: "Enter", behavior: "Follows the link inside it (native anchor behavior); the link is the consumer's router link." },
    ],
    notes:
      "An <li> that styles the one anchor inside it. Router apps pass their own link as the child; current clones it with aria-current=\"page\" (D93), and without current the child keeps its own aria-current; with href the NavItem renders the anchor itself (for plain links and presets) and current sets aria-current=\"page\" on it. The current page is marked by weight, a raised surface and an inline-start bar, never by colour alone, and the focus ring is drawn inset on the anchor.",
  },
  AppShell: {
    keyboard: [
      { keys: "Tab", behavior: "The first stop is the skip link (when given), then the header, the sidebar's links and buttons, and the links of main, in document order. The shell adds no stop of its own: main has tabIndex={-1}." },
      { keys: "Enter (on the skip link)", behavior: "Follows the fragment href: focus moves to main, drawing the shared focus ring inside its box, and the next Tab continues from main's first link." },
    ],
    notes:
      "A grid filling the viewport: the header sits in a row of its own and main is its own scroller, so nothing scrolls under the header and a focused element is never obscured by it (WCAG 2.2 Focus Not Obscured) without scroll-padding, which does nothing on a main that is not the document's scroller (D88). main carries id={mainId} and tabIndex={-1}, the skip link's target. A closed sidebar is `hidden`, so it leaves the layout and the accessibility tree while its id stays in the DOM for a toggle's aria-controls; the toggle's aria-expanded and sidebarOpen are wired by the consumer, since the shell is controlled and stores nothing. The sidebar is a div, not an aside: the NavTree inside is already the navigation landmark. sidebarTheme sets data-psi-theme on the sidebar alone, so its tokens re-resolve under that theme in a page that keeps its own; the sidebar paints --psi-bg-primary itself. Desktop frame only: no responsive drawer. Do not place a ToastRegion at top-start in an app with a skip link.",
  },
  Tabs: {
    keyboard: [
      { keys: "Tab", behavior: "Enters the tab list at its selected tab (one stop for the whole list), then moves on to the active panel. When value matches no tab, the first enabled tab holds the stop (the first tab if all are disabled) and none is selected; a selected disabled tab keeps the stop (D93)." },
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
