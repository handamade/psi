---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

Dialog gains `placement` — a drawer is a placement, not a component (D66)

```tsx
<Dialog open onClose={…} placement="inline-end" title="Transaction detail" />
```

`placement` is `center | inline-start | inline-end`, defaulting to `center`.
The `inline-*` values pin the panel full-height to that edge — that is Psi's
drawer / side sheet, and **there is deliberately no `Drawer` component**.

Everything a drawer needs beyond position, `Dialog` already owns: `showModal()`
modality, the platform focus trap, `aria-modal`, focus restore, the inert
background, `onClose(reason)` across esc/backdrop/close-button, the
`dismissible` gate, and the title/footer slots. A sibling component would have
to duplicate or wrap all of it — which is how a design system ends up with two
subtly different focus traps.

- **Placement changes position and nothing else.** Modality, focus behaviour
  and the dismissal reasons are identical under every value; a test asserts the
  full dismissal contract holds for all three.
- **Logical, not physical** — `inline-start` / `inline-end`, so an RTL theme
  flips without a second code path.
- `width` (`400 | 560 | 720`) is reused as the drawer's width; the height is
  always the viewport.
- A drawer's panel scrolls internally so a `dismissible={false}` footer stays
  reachable.

The `detail-drawer` composition pattern is unblocked and now composes `Dialog`,
so an agent asking for a slide-over gets working JSX. No new tokens and no new
contrast pairs — the drawer binds the existing `--psi-dialog-*` family.
