# Menu dismissal correctness and anchor box (D58)

Date: 2026-07-31. Status: **Draft** — targets 0.8.1.

Provenance: a browser investigation on 2026-07-31 (Chrome 148), triggered by a
report of "a bug in opening/close" against the Storybook `Placements` story.
The reported screenshot turned out to be two shallow story faults, but the
investigation surfaced a genuine component bug underneath that breaks the
shipped `row-actions` pattern.

This decision follows D53 (`Menu — the overlay tier`, merged as 44d7112) and
corrects it. D57 is reserved by the D56 spec for the theme console, so this
takes D58.

## The bug that matters

**Switching between two menus leaves both closed.** With two `Menu`s sharing
one `openId` — the natural shape of D53's own `row-actions` pattern — opening
B while A is open closes A *and* B. The user clicks B and nothing appears.

Measured ordering in Chrome 148:

```
click A   openId=null            -> openId=A, A opens
click B   openId=A               -> openId=B, B opens
onClose("outside") from=A        <- A's stale toggle, ~50ms late
                                    consumer sets openId=null, killing B
final: openId=null, both closed
```

Root cause, at `packages/react/src/Menu/Menu.tsx:103-126`. When the platform
light-dismisses A (on `pointerdown`, because B's trigger is outside A's
popover), A's popover is **already closed** by the time A's `open` prop flips
`true → false` in the consumer's re-render. The sync effect therefore takes
neither branch — `open && !isOpen` is false, and `!open && isOpen` is false
because `isOpen` is already false — so `suppressNextCloseRef` is **never
armed** (`Menu.tsx:109`). A's queued `toggle` then arrives, finds no
suppression, finds the popover closed, and falls through to
`onClose("outside")` at `Menu.tsx:125` — reporting a dismissal for a menu the
consumer has already closed.

`suppressNextCloseRef` cannot cover this by construction: it is armed only
where *Menu* drives the close. Here the *platform* drove it.

## Decisions

- **D58 — Menu never reports a dismissal for a menu the consumer has already
  closed.** `handleToggle` gains a guard on the current `open` value:

  ```tsx
  if (isPopoverOpen(el)) return;  // opening toggle — nothing to report
  if (!open) return;              // already controlled-closed: a stale light
                                  // dismiss the consumer already knows about
  onClose("outside");
  }, [onClose, open]);
  ```

  `open` is read straight from the closure, with `open` added to
  `handleToggle`'s `useCallback` deps. No ref is involved: React resolves
  `onToggle` via the props stamped onto the DOM node during the **mutation**
  phase of commit, so the handler that runs is never staler than the last
  commit — and the guard therefore depends on no effect-flush timing at all.

  This states an invariant worth naming in the `onClose` doc comment: *a
  dismissal is only ever reported for a menu that is currently open according
  to its own `open` prop.* Genuine light dismiss is unaffected — clicking
  empty background while open leaves `open` true, so the report still fires.

- **The anchor box must match the trigger, not its layout cell.**
  `menu.module.css:4` styles the wrapper `display: inline-flex` with no width.
  As a **grid item** (`justify-self: stretch` by default) or a **flex-column
  item** (`align-items: stretch`) it fills the cell, so the menu anchors to
  the cell edge. Measured at 1280×800 in the `Placements` grid: button 77px
  wide, wrapper 428px, menu anchored 351px right of its trigger.

  ```css
  .trigger {
    display: inline-flex;
    /* A grid or flex-column item is stretched by default; the anchor box
       must track the trigger, not the cell it happens to sit in. */
    width: fit-content;
  }
  ```

  This repairs **both** placement paths at once, because both read the same
  wrapper: `anchor-name` is set on it (`useMenuPlacement.ts:31`) and the JS
  fallback measures it with `getBoundingClientRect()`
  (`useMenuPlacement.ts:43`).

  Flex *rows* with `align-items: center` are unaffected — flex items are
  content-sized on the main axis and uncentred items are not stretched on the
  cross axis. This is why `apps/promo`'s planned Menu card does not hit it.

- **`Placements` is split into four single-menu stories.** `popover="auto"`
  mutually dismisses: showing one auto popover closes every other open one
  that is not its ancestor. Four sibling popovers therefore cannot be open at
  once — React runs the four sync effects in tree order and only the
  last-mounted survives. Proven directly in the story's own document:

  ```js
  a.showPopover();  // {a: true,  b: false}
  b.showPopover();  // {a: false, b: true}
  // with popover="manual": {c: true, d: true}
  ```

  The story becomes `PlacementBottomStart`, `PlacementBottomEnd`,
  `PlacementTopStart`, `PlacementTopEnd`, each with one open Menu. This keeps
  all four placements under VR, which D53's spec requires. A comment records
  why they cannot be combined, so nobody re-merges them.

- **`FallbackPlacement` must clean up after itself.** It currently overwrites
  `CSS.supports` and never restores it (`Menu.stories.tsx:81-83`), and injects
  a `<style>` scoped to `[data-psi-menu]` document-wide (`:86`). Storybook
  does not reload the preview iframe between stories, so every Menu rendered
  afterwards in the same session takes the JS fallback branch while the
  browser still applies `position-area` — the two fight, exactly as the
  story's own comment warns. Because `tags: ["autodocs"]` is global in
  `.storybook/preview.ts`, this also poisons the Menu docs page, where all
  eight menus were measured with `anchorSupportedNow === false`.

  The decorator restores `CSS.supports` on unmount and scopes its `<style>`
  to a wrapper class rather than the document.

## Testing: a Playwright interaction spec

**This bug class is unreachable from jsdom.** `packages/react/vitest.setup.ts`
polyfills the Popover API with a synchronous `toggle` dispatch, no light
dismiss and no mutual dismissal. Its comment claims light dismiss is
"exercised in Playwright VR" — VR only takes screenshots, so in practice it is
exercised **nowhere**. That gap is why D53 shipped this bug.

New spec at `apps/storybook/vr/menu.interaction.spec.ts`, driving a new
`SwitchingBetweenMenus` story (two triggers, one shared `openId`):

- open A, assert A open and B closed;
- click B's trigger, assert **B open and A closed** — the regression;
- click empty background, assert both closed and a genuine `onClose("outside")`
  still fired.

It lives in the existing `apps/storybook/vr` Playwright project, so CI's `vr`
job runs it with no new workflow. Being screenshot-free it is
platform-independent, so unlike the snapshot suite it also runs on macOS; a
root `test:e2e` script runs it alone via a `@interaction` grep.

**Extending the jsdom polyfill was rejected.** Teaching it mutual dismissal
and async toggle would be cheaper, but a polyfill that models the platform
approximately is what produced this false confidence in the first place. The
ordering that matters here (`pointerdown` → `beforetoggle` → `click` →
`toggle`) is precisely what a polyfill cannot be trusted to reproduce.

## Non-goals

- **No API change.** `MenuProps` is untouched; `onClose` keeps its three
  reasons. This is a correctness fix, not a contract change — the contract is
  only being *stated* more precisely.
- **No consumer workaround shipped as guidance.** Making `onClose` idempotent
  per menu (`setOpenId(c => c === id ? null : c)`) does work around the bug,
  but documenting it would enshrine a defect. Fix the component instead.
- **No re-open guard.** An earlier hypothesis — that clicking an open menu's
  trigger light-dismisses and then immediately re-opens — was tested and
  **refuted**: light dismiss lands on `pointerdown`, before `click`, and the
  queued `toggle` arrives after it. No guard is needed and none is added.

## Verification

- `pnpm build`, `pnpm test`, `pnpm lint` — clean.
- `pnpm test:e2e` — the new interaction spec passes locally on macOS.
- `pnpm vr` in **CI only**. Expect baseline churn, and treat it as the
  acceptance signal rather than noise:
  - the `.trigger` width fix moves Menu pixels wherever a menu sat in a grid
    or flex-column context;
  - `Placements` is deleted and four stories replace it — old snapshot gone,
    new ones added;
  - `SwitchingBetweenMenus` adds two more (light + ember).
  Any diff **outside** Menu stories means something unintended changed.
- Manual browser check that the four placements each anchor to their own
  trigger, and that the Menu docs page no longer takes the fallback branch
  after visiting `FallbackPlacement`.

## Rejected alternatives

- ~~**A latest-value `useRef` mirroring `open`**, instead of reading `open`
  from the closure.~~ **Reversed during implementation, 2026-08-01.** This
  spec originally mandated the ref and rejected the closure read on the
  grounds that the closure "makes correctness depend on React having
  re-rendered before the queued `toggle` arrives". That rationale was
  backwards, and it is recorded here rather than quietly deleted because the
  reasoning is easy to re-derive wrongly.

  Both approaches depend on the re-render. The ref depends on *more*: it is
  written in a passive effect, which React schedules as a separate task after
  commit, so there is a window in which the committed props already say
  `open: false` while `openRef.current` is still `true`. A `toggle` landing in
  that window defeats the guard. The closure read has no such window, and is
  eight lines shorter.
- **Switching to `popover="manual"`.** Would let sibling popovers coexist and
  make `Placements` renderable as written, but it forfeits the platform's light
  dismiss — the single largest thing D53 gets for free — and Menu would have to
  implement outside-click detection itself. Rejected outright.
- **Making the sync effect re-assert on every render** rather than `[open]`,
  so it would notice the platform's close and arm the suppression. Fixes this
  case but re-introduces the churn `[open]` exists to avoid, and still leaves
  the report firing for an already-closed menu in other orderings.
- **Moving `anchor-name` onto the cloned trigger element**, removing the
  wrapper from the anchor question entirely. Structurally cleaner and immune to
  any future layout context, but the wrapper is load-bearing for the JS
  fallback branch (`useMenuPlacement.ts:43` measures it) and D53's own comment
  calls it out as the anchor box. Larger change, no additional bug fixed today.
  Recorded as a carry.
- **Fixing only the stories.** The reported screenshot would go away, and the
  component bug — the one that breaks a shipped pattern — would remain.

## Carries

- **`anchor-name` on the wrapper.** The `width: fit-content` fix makes the
  wrapper track its trigger, but the wrapper is still an extra box in the
  layout. Moving the anchor onto the trigger element itself is the structural
  fix; revisit when the anchor floor rises and the JS fallback branch
  (`useMenuPlacement.ts:36-67`) can be deleted outright, since that is what
  keeps the wrapper necessary.
- **`vitest.setup.ts`'s inaccurate comment.** It claims light dismiss is
  covered by Playwright VR; it is not. Corrected as part of this work. The
  broader audit — what else the polyfill implies is covered but is not — stays
  open.
