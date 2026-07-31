---
"@handamade/psi-react": patch
---

Menu no longer reports a dismissal for a menu the consumer has already closed (D58)

Two menus sharing one `openId` — the shape of the `row-actions` pattern —
left **both** closed when you switched between them. Clicking B's trigger
light-dismisses A at the platform level before the consumer's click handler
runs, so A's popover was already closed by the time its `open` prop flipped;
the sync effect then armed no suppression and A's queued `toggle` reported
`onClose("outside")`, clearing `openId` and closing B milliseconds after it
opened.

`onClose` now carries an invariant: a dismissal is only ever reported for a
menu that is still open according to its own `open` prop. Genuine light
dismiss, Esc and item-select are unaffected. No API change.

Also fixed: the trigger wrapper is the anchor box for both placement paths and
was being stretched to its cell as a grid or flex-column item, so the menu
anchored to the cell edge instead of the trigger. It now sizes to its trigger.
