# Tabs and the navigation tree keep their contracts with consumer state (D93)

Date: 2026-10-08. Status: **Implemented** on branch `d93-tabs-navitem-consumer-state`.

Provenance: the fourth item of the Psi 0.22 portal handoff
(`psi-handoffs/2026-10-07-psi-0.22-portal-handoff.md`, brief D93, from the
portal's `WEB-77` decisions D2 and D5). Two components break a promise when the
consumer's own state is not the happy path, and each made the portal write a
workaround.

## What's there today

1. **`Tab` took `tabIndex={selected ? 0 : -1}`.** When the controlled `value`
   matches no tab, every tab has `-1` and the list has no tab stop, so the tabs
   are unreachable by keyboard. That is not exotic in the portal: the address
   names a tab the user's permissions hide. The portal fell back to the first
   tab itself (D2).
2. **`NavItem` set `aria-current="page"` only on the anchor it renders from
   `href`.** A router app passes its own `Link` as the child, so `current` did
   nothing for it. The portal cloned each link to add the attribute (D5), the
   way `Menu` clones its trigger.

## Decisions

- **D93 — A `value` that matches no tab still leaves the tab list one tab
  stop, and `NavItem current` reaches a child link.**
  - **`Tabs`.** When `value` names *no registered tab*, the first enabled tab,
    in document order, takes `tabIndex={0}`. If every tab is disabled, the first
    registered tab takes it, so the list never has zero stops. The selection
    stays the consumer's: no tab is `aria-selected`, no panel is shown, and
    `Tabs` does not call `onValueChange`.
  - **A selected disabled tab keeps the stop**, exactly as today. The handoff
    wrote the trigger as "matches no *enabled* tab"; the human chose "matches no
    tab" instead, to keep the existing default. Disabled tabs use
    `aria-disabled`, not `disabled`, so they stay focusable, and the APG puts
    the stop on the active tab. Moving it to another tab because the active one
    is disabled would change a case that works today.
  - **Where the computation lives: in the `Tabs` provider.** Only the provider
    sees every registered tab and `value` together; a `Tab` knows itself alone.
    Each `Tab` registers `{ value, disabled, el }` from a layout effect, and
    `Tabs` derives one `tabStop` value, which it puts in context. `Tab` reads
    `ctx.tabStop === value` and does no arithmetic of its own, so there is a
    single place that decides who holds the stop. Document order comes from
    `compareDocumentPosition` on the registered elements, so a tab inserted
    before the first one wins correctly.
  - **`TabsContextValue`** (exported) gains `tabStop?` and `registerTab?`, both
    optional: a hand-written `TabsContext.Provider` still type-checks, and
    without them `Tab` falls back to `value`, as before D93.
  - **Before any tab has registered** (the server render, the first client
    render), `tabStop` is `value` itself, which is what `Tab` did before. A
    matching `value` renders its stop in server HTML unchanged. An unmatched
    one gets the fallback stop when the layout effects run, before paint on the
    client; server HTML for that case has no stop until hydration. The
    alternative, reading the DOM, would be no better and would add a second
    source of truth.
  - **Dev warning**, once per distinct unmatched value:
    `Tabs: value "<x>" matches no tab; the first enabled tab takes the tab
    stop.` It is a `useEffect` that returns early when
    `process.env.NODE_ENV === "production"`, the same effect-based shape as
    `Menu`'s trigger warning, with `Pagination`'s production gate added.
  - **`NavItem`.** With `current` and no `href`, a single element child is
    cloned with `aria-current="page"`. Its other props and handlers are
    untouched. Without `current` (absent or `false`) nothing is cloned, so a
    child that carries its own `aria-current`, as a router's active link does,
    keeps it. A string child, several children or a Fragment is rendered as it
    is, since none can carry the attribute.
  - **No prop changes.** Every default is as before, except that an unmatched
    `value` used to leave no tab stop and a `current` on a child used to be
    ignored.

## Consequences

- An unmatched `value` is a consumer decision that `Tabs` now survives rather
  than hides: the warning names it, and the consumer still owns the selection.
- `Tab` now registers with its `Tabs`, so it costs one extra render of `Tabs`
  on mount and when a tab's `disabled` flips.
- The portal's D2 fallback and D5 clone can go.

## Verification

- Tests first, red before the change. On `Tabs`: one stop and nothing
  selected; a disabled first tab skipped; the warning; document order after an
  insertion. Added after review: a selected disabled tab keeping the stop; an
  unmatched value with every tab disabled giving one stop on the first tab; the
  stop following the fallback tab when it unmounts or toggles `disabled`; and a
  bare `TabsContext.Provider`. On `NavItem`: `current` marks a child link.
- The rest are regression guards that pass before and after: a matching
  `value` neither warns nor moves the stop, the stop returns to the selected
  tab when `value` starts to match, a child's handlers survive the clone, and
  an `aria-current` the child carries is left alone without `current`.
- An axe case renders a `Tabs` with an unmatched `value`.
- The existing `NavItem` test that pinned `current` as ignored for a child link
  is rewritten, because that is the behaviour D93 changes.
