# A Toast dismiss button with a name you can set (D117), and ESLint that skips agent folders

Date: 2026-11-16. Status: **Awaiting approval**, not implemented. Branch
`d117-toast-dismiss-label`.

Provenance: a consumer that ships in German could translate everything on a
`Toast` except the dismiss button, which is named "Dismiss notification" in
`Toast.tsx` and has no prop. Same shape as `statusLabel` (D83), which fixed the
hidden status word. A second, unrelated request rides along because it is one
line: ESLint lints worktrees under `.claude/`.

D116 is in flight in a sibling session and D115 in another worktree. D117 was
allocated by the coordinating session. Re-check the number when the PR opens.

## What's there today

- **`Toast` hardcodes the dismiss button's name.** `packages/react/src/Toast/Toast.tsx`
  renders `<IconButton aria-label="Dismiss notification">` when `onDismiss` is set.
- **`ToastProvider` can't reach it.** It renders `<Toast>` for each queued toast,
  passing `variant`, `action`, `politeness`, `statusLabel` and `onDismiss`.
  `show()` takes the same set. A translated app would have to repeat any label at
  every `show()` call, or give up on the provider.
- **`Dialog.closeLabel` (D101) is not a precedent for this.** It is *visible text*:
  setting it swaps the icon `IconButton` for a ghost `Button` that shows the
  string. It does not rename the icon button, and Dialog's "Close dialog" name is
  still hardcoded. Reusing the name `closeLabel` for "the accessible name only"
  would give two props with one name and two behaviours.
- **The real precedents are `statusLabel` (D83) and `aria-label`.** `statusLabel`
  is a translated string with a default; `ToastProvider`'s `aria-label` defaults to
  "Notifications"; `Pagination`'s to "Pagination".
- **ESLint ignores `.worktrees/**` but not `.claude/` or `.cursor/`**
  (`eslint.config.js`), so a plain `pnpm lint` in a checkout with worktrees under
  `.claude/worktrees/` lints them as well.

## Decisions

- **D117 — `Toast`, `ToastOptions` and `ToastProvider` take `dismissLabel`, the
  dismiss button's accessible name, default `"Dismiss notification"`.**
  - **Name: `dismissLabel`.** It pairs with `onDismiss`, which is what renders the
    button, and it stays clear of `Dialog.closeLabel`. Chosen with the user over
    `closeLabel` and `dismissAriaLabel`.
  - **Type: `string`, default `"Dismiss notification"`.** The default is what the
    button is named today, so nothing changes for a consumer that doesn't set it.
    Unlike `statusLabel` there is no `null`: a button without a name is not an
    option, so there is nothing to drop. The empty string is not special-cased, as
    `statusLabel`'s isn't; it gives an unnamed button, and a consumer that passes it
    owns that.
  - **Effect: the accessible name only.** The button stays an icon `IconButton`.
    Showing visible text is Dialog's `closeLabel`, a different feature, and nothing
    here asks for it.
  - **Three places, one resolution.** `Toast.dismissLabel`,
    `ToastOptions.dismissLabel` (per `show()`), and `ToastProvider.dismissLabel`
    (every queued toast). The most specific one wins:

    ```
    toast's own (show())  >  provider's  >  "Dismiss notification"
    ```

    - **The provider's label is read at render, not copied into the queue.** A
      language switch then renames toasts already on screen. The per-toast value is
      stored in the queue, as `statusLabel` is, so that `show()` can leave it
      unset and fall through.
    - **The provider takes the prop itself.** It is not forwarded to the region
      `<div>`; `regionProps` stays the HTML attributes it is today.
  - **`announce()` takes none.** An `Announcement` has no dismiss button.
  - **No story, no baseline.** The name is not visible, so no pixel changes and
    `vr` has nothing to refresh. An axe case with a translated label sits in
    `a11y.axe.test.tsx` beside "Toast with a translated status word".
  - **Docs.** The prop's TSDoc feeds the generated `docs/Toast.md`,
    `docs/ToastProvider.md` and the manifest, so those need no hand edits.
    `a11y-meta.ts` and `llms.txt` are hand-written and do: the "labelled
    'Dismiss notification'" sentence and the `show({…})` and `<ToastProvider …>`
    lines.
  - **Changeset:** minor on `@handamade/psi-react`, with the lockstep packages.

- **P61 — no decision number.** `eslint.config.js` adds `.claude/**` and
  `.cursor/**` to `ignores` beside `.worktrees/**`. Verified by putting a file with
  a lint error under `.claude/worktrees/probe/`, running `pnpm lint` before and
  after: before, it reports; after, it does not. No changeset: tooling only.

## Follow-ups, not in this PR

- `Dialog`'s "Close dialog" and `Banner`'s "Dismiss" are hardcoded the same way. A
  `dismissLabel` on `Banner` and a name prop on `Dialog`'s icon button would close
  the gap; `Dialog`'s needs its own name decision, since `closeLabel` is taken.

## Out of scope

- Changing the default wording, or translating anything for the consumer.
- A visible-text dismiss button on `Toast`.
