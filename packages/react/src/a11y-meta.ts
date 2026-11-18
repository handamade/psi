/**
 * Single-source keyboard/assistive-tech metadata, rendered into generated
 * docs (see scripts/emit-docs.ts). Every claim here is verified against the
 * component's implementation or an existing test assertion — see
 * docs/superpowers/task-7-report.md for the claim-by-claim evidence.
 */
export interface A11yEntry {
  keyboard: Array<{ keys: string; behavior: string }>;
  notes?: string;
  /** Machine-readable form of "Requires an accessible name": at least one of
   * these attributes must be present. Read by the MCP's check tool (D129). */
  accessibleName?: { oneOf: string[] };
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
    accessibleName: { oneOf: ["aria-label"] },
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
      "error: same contract as Input — sets a red border only. Inside a Field, aria-invalid and aria-describedby are wired automatically (D49); standalone, pair them yourself. No multiple (D130): pick several values with Combobox multiple.",
  },
  Combobox: {
    keyboard: [
      { keys: "Typing", behavior: "Opens the list and filters it; the first match is highlighted." },
      { keys: "Arrow Down / Arrow Up", behavior: "Closed: opens the list on the picked option, or else the first / last. Open: moves the highlight, wrapping at the ends. Disabled options are reachable." },
      { keys: "Alt + Arrow Down / Alt + Arrow Up", behavior: "Alt + Down opens the list without highlighting an option; Alt + Up closes it." },
      { keys: "Page Down / Page Up", behavior: "Open: moves the highlight 10 options, stopping at the ends." },
      { keys: "Home / End", behavior: "Move the caret in the text (native); they never move the highlight." },
      { keys: "Enter", behavior: "Open: picks the highlighted option and never submits the form; single-select closes the list, multi-select keeps it open; on a disabled option it does nothing. Open with nothing highlighted, single-select: settles the text as blur does (emptied text clears the value, other edited text goes back to the picked label) and closes the list (D134). Closed: with edited text in a single-select, settles it and doesn't submit (D134); otherwise native (submits a form)." },
      { keys: "Escape", behavior: "Single-select: cancels the edit (D134). Open: closes the list and restores the picked label (empty with no value). Closed with edited text: restores the picked label. Either way it stops propagation, so a surrounding Dialog stays open; closed with unedited text it does nothing and reaches the Dialog. It never clears a value. Multi-select: open, closes the list; closed, clears the search text, if there is any." },
      { keys: "Tab / Shift + Tab", behavior: "Closes the list and moves focus on; picks nothing." },
      { keys: "Backspace (multi-select, empty input)", behavior: "Removes the last picked value." },
    ],
    notes:
      "Follows the ARIA 1.2 combobox pattern with list autocomplete (D130). Focus stays in the <input role=\"combobox\" aria-autocomplete=\"list\" autocomplete=\"off\">; aria-controls names the listbox, aria-expanded is true only while the popup shows a listbox with options (a \"No matches\" or loading line alone leaves it false, D134), and aria-activedescendant names the highlighted option while the list is open, which is also drawn with the highlighted background while the input keeps its focus ring. The popup is a manual popover on the top layer (it draws above a modal Dialog) holding a role=\"listbox\" (aria-multiselectable in multi-select, aria-busy while loading) named by the Field's label or the input's aria-label; options are role=\"option\" with aria-selected, aria-disabled where disabled, and a description joined into the name. The \"No matches\", loading and \"more\" lines are siblings of the listbox, never options; while one shows, the input's aria-describedby names it, after a Field's own message (D134). A polite, visually hidden live region says the result count after filtering (resultsLabel), the loading line or \"No matches\"; announce={false} removes it for an app that speaks through its own announcer, as on Field (D134). When the options change, the highlight stays on the same option by value, else moves to the first, else clears. The chevron, the clear button and each Tag's remove button are tabindex=-1, so the Combobox is one Tab stop; pressing them, or an option, keeps focus in the input. Single-select picks only from the list: on blur, unmatched text goes back to the picked label, and emptied text clears the value to null. valueLabel names a picked value the options don't hold (D134). The list opens and closes by itself unless open is set; then it shows exactly while open is true, and typing, the arrows, the chevron, Esc, Tab, blur and a pick only ask through onOpenChange (D134). required sets aria-required and a custom validity read from the value, not the text. Inside a Field the id, label, description, invalid and required wiring are automatic (D49). Translatable names: clearLabel, toggleLabel, removeLabel, emptyMessage, loadingMessage, resultsLabel.",
  },
  Field: {
    keyboard: [
      { keys: "Tab", behavior: "Focus moves to the wrapped control; the label is announced with it." },
    ],
    notes:
      "Wires label association, aria-describedby, aria-invalid and required into a wrapped Input, Select, Textarea, Checkbox or Switch automatically, and the Field's id, aria-invalid and required win over the control's own props, so a caller's id cannot disconnect the label (set a known id with htmlFor) and a caller's aria-invalid={false} cannot hide the error (D135). A Checkbox or Switch in a Field that is not a group is named by the Field's label and its own; in group mode it takes aria-invalid only (D108). The message line is aria-live=polite. Group mode renders fieldset/legend; with labelPosition=\"start\" it renders `<div role=\"group\">` named by its label through aria-labelledby, because a fieldset cannot share a FieldStack's columns (D115). required marks the label with an aria-hidden asterisk and flows required to the control; requiredText replaces the asterisk with a visible word such as \"(Required)\", also aria-hidden, because the control's required/aria-required is what assistive tech reads (D84). A control Psi did not write joins the same wiring through useFieldControl(): spread its result — id, aria-labelledby (a label-for names only a labelable element, and a custom control is usually not one), aria-describedby, aria-invalid, aria-required, required, each present only when the Field sets it — onto the element that takes focus (D84). labelPosition=\"start\" puts the label beside the control, with the message under the control (D115); only the visual position changes.",
  },
  FieldStack: {
    keyboard: [
      { keys: "Tab", behavior: "Skipped — FieldStack itself is not focusable; focus moves through its Fields in source order." },
    ],
    notes:
      "Plain `<div>` with no role (D115): a form's column of Fields. labelPosition=\"start\" moves the labels beside their controls visually; the document order stays label, control, message, so reading and focus order are unchanged.",
  },
  Dialog: {
    keyboard: [
      { keys: "Esc", behavior: "Dismisses via onClose('esc') when closeOnEscape (default: dismissible); swallowed otherwise (D101)." },
      { keys: "Tab", behavior: "Focus is trapped inside by the native <dialog> top layer; restored on close." },
    ],
    notes:
      "Rendered with showModal(): aria-modal, inert background and focus restore come from the platform. title wires aria-labelledby; without title, pass aria-label. Backdrop click dismisses only when dismissible. placement=\"inline-start\"/\"inline-end\" pins the panel full-height to that edge — that is Psi's drawer, and it changes nothing about modality, the focus trap, focus restore or the dismissal reasons (D66). A drawer's panel scrolls internally so a dismissible={false} footer stays reachable.",
  },
  Checkbox: {
    keyboard: [{ keys: "Space", behavior: "Toggles. Native <input type=checkbox> underneath (visually hidden)." }],
  },
  Textarea: {
    keyboard: [{ keys: "Tab", behavior: "A native <textarea>; Enter adds a line, it does not submit the form." }],
    notes:
      "Inside a Field, id/aria-describedby/aria-invalid/required are wired as for Input (D104). minLength and maxLength are native. With maxLength, a counter under the control shows {length} / {maxLength}; it is not a live region, and it joins aria-describedby so it is read with the field on focus, with a visually hidden \"characters\".",
  },
  RadioGroup: {
    keyboard: [
      { keys: "Tab", behavior: "Enters the group on the checked radio, or the first one; one tab stop for the group." },
      { keys: "Arrow keys", behavior: "Move to the next or previous radio and select it (native radios sharing one name)." },
    ],
    notes:
      "Native radios sharing one name (D104). Inside Field group the fieldset and legend form and name the group, so RadioGroup adds no role; standalone it is role=\"radiogroup\" and needs aria-label or aria-labelledby. A required or invalid Field makes every radio required and aria-invalid.",
  },
  Radio: {
    keyboard: [{ keys: "Space", behavior: "Selects the focused radio when none is selected." }],
    notes: "Native <input type=radio> underneath (visually hidden), drawn like Checkbox on a circle. Takes its name, checked state, required and aria-invalid from its RadioGroup.",
  },
  Switch: {
    keyboard: [{ keys: "Space", behavior: "Toggles. Native checkbox input with role=\"switch\"; announced as a switch, not a checkbox." }],
  },
  Tag: {
    keyboard: [{ keys: "Enter / Space (dismiss button)", behavior: "onDismiss renders a real <button>; keyboard-dismissible." }],
    notes: "Passive label otherwise; not in the tab order without onDismiss. dismissLabel names the dismiss button (default \"Dismiss\"), so several dismissible tags can each say what they remove (D130).",
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
  Stack: {
    keyboard: [
      { keys: "Tab", behavior: "Skipped — Stack itself is not focusable; focus moves through its children in source order." },
    ],
    notes:
      "Plain <div> with no role (D109): a column with a gap. Visual order is source order, so reading and focus order match.",
  },
  Text: {
    keyboard: [{ keys: "Tab", behavior: "Not focusable." }],
    notes:
      "Renders the element `as` names (p by default). Use h2–h4 for a heading at its outline level, whatever its `size`. The page's h1 is PageHeading (D118).",
  },
  PageHeading: {
    keyboard: [{ keys: "Tab", behavior: "Not focusable." }],
    notes:
      "Renders the page's one h1 (D118). Use one per screen, as the first thing in the page: inside an AppShell, the page's first child, after any banner. Sub-headings are Text as=\"h2\" or \"h3\". It has no as or size prop, because a page heading is always the h1.",
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
      { keys: "Arrow Down / Arrow Up", behavior: "Moves between items, wrapping at both ends. Disabled items are reachable, so a user learns they exist, and cannot be activated (D131)." },
      { keys: "Home / End", behavior: "Jumps to the first or last item." },
      { keys: "Any single printable key", behavior: "Typeahead — focuses the first item whose label starts with the typed prefix; the prefix resets after 500ms. Keystrokes with Meta/Ctrl/Alt held are ignored." },
      { keys: "Esc", behavior: "Suppresses the platform's own dismissal and reports onClose(\"esc\"); the menu stays open until the consumer flips `open` (D50)." },
      { keys: "Enter / Space", behavior: "Activates the focused item (native button behavior)." },
      { keys: "Arrow Down / Arrow Up on the closed trigger", behavior: "Opens the menu on its first / last item by clicking the trigger, since Menu cannot open itself; the consumer's onClick flips `open` (D102)." },
      { keys: "Tab / Shift Tab", behavior: "Reports onClose(\"tab\") and lets focus move on to the next control; the consumer flips `open`, and focus is not pulled back to the trigger (D102)." },
    ],
    accessibleName: { oneOf: ["aria-label"] },
    notes:
      "Opens on the native top layer via popover=\"auto\", which supplies light dismiss. Controlled-only: every dismissal path (esc, item-select, outside) only reports onClose(reason) — the consumer must flip `open` to actually close it; outside is the one path the platform has already acted on by the time it is reported. Opening moves focus to the first item — Menu takes focus off the trigger as soon as `open` becomes true. A re-render that removes the focused item moves focus to the item now at its position, or the last item; an emptied menu holds focus itself (tabindex=-1, never a Tab stop), so Esc and Tab still report their own reasons (D131). Focus returns to the trigger when the menu actually closes, and only if focus is still inside the menu, so a light dismiss onto another control does not steal focus back. Requires an accessible name — pass aria-label. Placement uses CSS anchor positioning where supported and a JS fallback below that floor; below it there is no collision flip. Past --psi-menu-max-height (the shared --psi-popup-max-height, 320px) the menu scrolls and the focused item stays in view; a menu taller than the room on both sides of its trigger opens on the larger side and fills it (D131).",
  },
  MenuItem: {
    keyboard: [{ keys: "Enter / Space", behavior: "Activates; Menu reports onClose(\"item-select\") but does not close itself." }],
    notes:
      "Renders a real <button>. disabled sets aria-disabled (not the disabled attribute) so the item stays focusable and discoverable: the arrow keys, Home, End and typeahead reach it (D131), and activating it does nothing and reports nothing. variant=\"danger\" is for destructive actions only.",
  },
  MenuSeparator: {
    keyboard: [],
    notes: "Non-interactive rule with role=\"separator\" — exposed to assistive tech as a separator, never focusable, and skipped by roving navigation.",
  },
  MenuText: {
    keyboard: [],
    notes:
      "A line of text that is not an action (D99): inside the role=\"menu\" element with no role of its own, never focused, skipped by the arrows, Home, End and typeahead, and never aria-hidden. In a menu's focus mode a screen reader reaches it by browse mode or the VoiceOver cursor. To have it spoken on entering the menu, give it an id and pass that id to Menu's aria-describedby; that is off by default, because a description may be spoken on every open.",
  },
  TableCaption: {
    keyboard: [
      { keys: "Tab", behavior: "Not a tab stop. With tabIndex={-1} the consumer moves focus to it after a page change, and the shared ring is drawn inside the caption." },
    ],
    notes:
      "Renders <caption>, which names the table for assistive tech and is visible, unlike an aria-label on Table. Put the range in `detail` (\"Rows 51–100 of more than 100,000\") so that moving focus to the caption after a token-paged page change reads the new range (D85). Remaining attributes land on the element.",
  },
  TableContainer: {
    keyboard: [
      { keys: "Tab", behavior: "A tab stop, so the region can be scrolled from the keyboard in every browser; draws the shared focus ring outside its frame." },
      { keys: "Arrow keys / Page Up / Page Down / Home / End", behavior: "Scroll the region while it has focus (native)." },
    ],
    notes:
      "A <div role=\"region\"> that scrolls its Table both ways and keeps a stickyHeader at its top (D126); maxBlockSize caps its height. It draws the frame, so the table inside drops its own. Named by the table's TableCaption through aria-labelledby (the caption gets an id if it has none); pass aria-label or aria-labelledby instead when there is no caption. Inside it the caption sits within the frame and scrolls with the content; focusing it after a page change scrolls it back into view.",
  },
  CursorPagination: {
    keyboard: [
      { keys: "Tab", behavior: "Reaches the Previous and Next buttons in order; a disabled direction is skipped." },
      { keys: "Enter / Space", behavior: "Activates the focused button (native button behavior). If that disables it — Next on the last page — focus moves to the other direction (D127)." },
    ],
    notes:
      "A <nav> named \"Pagination\" (override with aria-label) holding two ghost Buttons with visible words — Previous and Next, translatable through previousLabel/nextLabel — each with a chevron that only reinforces the word (D85). A direction that is unavailable is disabled, not hidden. It holds no state: the consumer holds the page tokens and answers hasPrevious/hasNext. Pair it with a TableCaption whose detail states the range, and move focus there after a page change.",
  },
  Pagination: {
    keyboard: [
      { keys: "Tab", behavior: "Reaches Previous, each page button and Next in order; a disabled arrow is skipped, and the ellipsis is not a stop." },
      { keys: "Enter / Space", behavior: "Activates the focused button (native button behavior). If Previous or Next reaches an end and disables itself, focus moves to the current page's button (D127)." },
    ],
    notes:
      "A <nav> named \"Pagination\" (override with aria-label). The arrows are icon-only IconButtons named \"Previous page\" and \"Next page\" — translatable through previousLabel/nextLabel. The current page's button carries aria-current=\"page\"; the ellipsis is aria-hidden. The slot count and slot width are fixed, so the arrows do not move under the pointer as the page changes (D127). At or below 560px of viewport the wide form's extra pages are display: none, so they leave the tab order and the accessibility tree too. After a page change focus stays in the pager: the current page's aria-current reports where the user is.",
  },
  Toast: {
    keyboard: [
      { keys: "Tab", behavior: "Reaches the action and the dismiss button in DOM order. Esc is not a dismissal — a toast is not modal and traps nothing." },
      { keys: "Enter / Space", behavior: "Activates the focused action or dismiss button." },
    ],
    notes:
      "Presentational and controlled (D64): onDismiss reports and the owner disposes; Toast never removes itself. It carries no role/aria-live of its own — politeness belongs to ToastRegion's two persistent wrappers. The variant's meaning is announced by a visually hidden status word (\"Success:\", \"Warning:\", \"Error:\"), never by colour and icon shape alone; the icon is aria-hidden. neutral has no status and gets no prefix. statusLabel replaces that word with a translated one, or drops it with null (D83). politeness tells ToastRegion which wrapper speaks the toast; unset, the variant decides. The dismiss button requires no props — it is labelled \"Dismiss notification\", and dismissLabel (also on show() and ToastProvider) renames it, e.g. to a translated string (D117).",
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
  Count: {
    keyboard: [],
    notes:
      "A <span> with no role and no aria-live (D124): a count that changes announces nothing on its own; an app's own announcer speaks a change. Its visible text joins the name of the link or button it sits in (\"Cards 238\", \"Cards 999+\"). label replaces the number for a screen reader (the number becomes aria-hidden, the label psi-sr-only): start it with the number shown. The attention tone is a pill in medium weight, never colour alone, but the tone itself is visual, so an attention count should carry a label.",
  },
  SkipLink: {
    keyboard: [
      { keys: "Tab", behavior: "Takes focus and becomes visible at the inline-start top corner, drawing the shared focus ring. Put it first in the document so it is the first tab stop." },
      { keys: "Enter", behavior: "Follows the fragment href: focus moves to the target, and the next Tab continues from inside it." },
    ],
    notes:
      "A native anchor, visually hidden until it is focused (:focus-visible) and with no script (D88). Fragment navigation moves focus only to a focusable target, so the element named by href must be focusable: tabIndex={-1} is enough, and AppShell's main has it. A modal Dialog makes the link inert, so it never needs to beat one. A ToastRegion is on the native top layer and paints over the focused link whatever its z-index: do not place one at top-start in an app with a skip link.",
  },
  Link: {
    keyboard: [
      { keys: "Tab", behavior: "Takes focus like any link and draws the shared focus ring (:focus-visible)." },
      { keys: "Enter", behavior: "Follows the link. Your router's own link handles it when you pass one as the child." },
    ],
    notes:
      "A native anchor (D119), either the one Link renders from href or your router's link passed as the only child. Underlined at rest, so it is never told from the text around it by colour alone (WCAG 1.4.1): the accent scores about 2:1 against body text. current sets aria-current=\"page\", drawn as medium-weight text with no underline. Psi adds no target or rel and no new-tab marker; if a link opens a new tab, say so in its text.",
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
      "Controlled-only: open and onOpenChange are required and the group never changes its own state. Renders a <button type=\"button\"> with aria-expanded and aria-controls naming its <ul>, which carries `hidden` when closed, so the links leave the layout and the accessibility tree while aria-controls still resolves. The chevron is aria-hidden and turns on a duration token; the label and aria-expanded carry the meaning. An icon (D124) sits before the label in an aria-hidden span; the label stays the button's name, and the icon stays when the group is closed.",
  },
  NavItem: {
    keyboard: [
      { keys: "Enter", behavior: "Follows the link inside it (native anchor behavior); the link is the consumer's router link." },
    ],
    notes:
      "An <li> that styles the one anchor inside it. Router apps pass their own link as the child; current clones it with aria-current=\"page\" (D93), and without current the child keeps its own aria-current; with href the NavItem renders the anchor itself (for plain links and presets) and current sets aria-current=\"page\" on it. The current page is marked by weight, a raised surface and an inline-start bar, never by colour alone, and the focus ring is drawn inset on the anchor. icon and count (D124) go inside the link: icon (aria-hidden), label, count. The count's text joins the link's name (\"Cards 238\"), or its label does; it is not a live region. A router link is cloned to hold them; a child that is not one link element gets neither, with a development warning. A router link whose children is a function keeps it: NavItem wraps the function so its result becomes the label.",
  },
  AppShell: {
    keyboard: [
      { keys: "Tab", behavior: "The first stop is the skip link (when given), then the header, the sidebar's links and buttons, and the links of main, in document order. The shell adds no stop of its own: main has tabIndex={-1}." },
      { keys: "Enter (on the skip link)", behavior: "Follows the fragment href: focus moves to main, drawing the shared focus ring inside its box, and the next Tab continues from main's first link." },
    ],
    notes:
      "A grid filling the viewport: the header sits in a row of its own and main is its own scroller, so nothing scrolls under the header and a focused element is never obscured by it (WCAG 2.2 Focus Not Obscured) without scroll-padding, which does nothing on a main that is not the document's scroller (D88). main carries id={mainId} and tabIndex={-1}, the skip link's target. A closed sidebar is `hidden`, so it leaves the layout and the accessibility tree while its id stays in the DOM for a toggle's aria-controls; the toggle's aria-expanded and sidebarOpen are wired by the consumer, since the shell is controlled and stores nothing. The sidebar is a div, not an aside: the NavTree inside is already the navigation landmark. sidebarTheme sets data-psi-theme on the sidebar alone, so its tokens re-resolve under that theme in a page that keeps its own; the sidebar paints --psi-bg-primary itself. Desktop frame only: no responsive drawer. Do not place a ToastRegion at top-start in an app with a skip link. main's rounded corner (--psi-app-shell-main-radius, D110) keeps the skip link's ring: the inset outline follows the curve, measured in Chromium in LTR and RTL. A `banner` renders inside main, before the page, so its action is a tab stop there; Banner is not a live region, so showing one announces nothing (D113).",
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
      { keys: "Arrow Left / Arrow Right", behavior: "Horizontal orientation: moves to the previous/next tab, wrapping at both ends. Selection follows focus (automatic activation), except onto a disabled tab, which takes focus and the tab stop but not the selection (D131)." },
      { keys: "Arrow Up / Arrow Down", behavior: "Vertical orientation: the same, on the block axis. The cross-axis arrows are ignored rather than swallowed." },
      { keys: "Home / End", behavior: "Jumps to the first or last tab, disabled or not." },
    ],
    accessibleName: { oneOf: ["aria-label"] },
    notes:
      "Renders role=\"tablist\" with aria-orientation. Requires an accessible name — pass aria-label, which is promoted onto its own props interface (D60) so the manifest shows it. Owns the roving tabindex: exactly one tab is in the page tab order at a time.",
  },
  Tab: {
    keyboard: [{ keys: "Enter / Space", behavior: "Activates (native button behavior); arrow keys already select on focus." }],
    notes:
      "Renders a real <button> with role=\"tab\", aria-selected and aria-controls. disabled sets aria-disabled (not the disabled attribute) so the tab stays focusable and discoverable: the arrow keys reach it (D131), and it is refused for selection — the same choice MenuItem made in D53.",
  },
  TabPanel: {
    keyboard: [
      { keys: "Tab", behavior: "The panel itself is a tab stop (tabIndex=0), so a panel whose content has no focusable element is still reachable." },
    ],
    notes:
      "Renders role=\"tabpanel\" with aria-labelledby pointing back at its tab. Unselected panels stay in the DOM with `hidden`. Its content does not see its Tabs (D132): a panel renders its children under an empty TabsContext, so a Tab, TabList or SegmentedControl in a panel never wires itself to the outer tab set.",
  },
  SegmentedControl: {
    keyboard: [
      { keys: "Tab", behavior: "Enters the control at its selected segment (one stop for the whole control), then leaves it. When value matches no segment, the first enabled segment holds the stop and none is selected; a selected disabled segment keeps the stop (D93)." },
      { keys: "Arrow Right / Arrow Left", behavior: "Moves to the next/previous segment, wrapping at both ends, and selects it. On its own (a radio group) a disabled segment is skipped, as native radios do; inside Tabs it takes focus but not the selection, as a disabled Tab does (D131)." },
      { keys: "Arrow Down / Arrow Up", behavior: "On its own (a radio group): the same as Right/Left, as in the APG radio group. Inside Tabs (a tab list): ignored, as in a horizontal TabList." },
      { keys: "Home / End", behavior: "Jumps to the first or last segment (the first or last enabled one in a radio group) and selects it unless it is disabled." },
    ],
    notes:
      "Two roles, told apart by value (D132). With value and onValueChange it is role=\"radiogroup\", for a setting that applies at once, wherever it renders. Without them, inside Tabs (outside its TabPanels) it is the role=\"tablist\" (aria-orientation=\"horizontal\"), in place of TabList, and Tabs owns the value; anywhere else that throws. Requires an accessible name: aria-label or aria-labelledby. It is not a form field: it submits nothing and does not join a Field; a form value is a RadioGroup. The selected segment shows by the accent tint, the accent label and a 1px inset ring that clears 3:1, so never by colour alone; in forced colours it paints Highlight.",
    accessibleName: { oneOf: ["aria-label", "aria-labelledby"] },
  },
  Segment: {
    keyboard: [{ keys: "Enter / Space", behavior: "Selects the segment (native button behavior); the arrow keys already select on focus." }],
    notes:
      "A <button type=\"button\">: role=\"radio\" with aria-checked on its own, role=\"tab\" with aria-selected and aria-controls (naming the TabPanel of the same value) inside Tabs (D132). disabled sets aria-disabled, not the disabled attribute, so it stays discoverable and a click does nothing; the arrows skip it in a radio group and reach it, without selecting it, in a tab list (D131). The label is the accessible name; it truncates visually when the control is narrower than its labels but stays whole in the DOM.",
  },
};
