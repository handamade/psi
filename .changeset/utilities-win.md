---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Utilities win over components (D94). **This changes the cascade for every consumer — check your resets before upgrading.**

- **Component CSS now ships inside `@layer psi.components`.** Every rule in `@handamade/psi-react/styles` sits in the layer Psi's token stylesheets already order below `psi.utilities`, so a utility on a component root beats the component's own value: `<Tabs className="psi-gap-24">` gets a 24px gap, where it got 16px before.
- **Unlayered CSS in your app now beats every Psi component rule, whatever its specificity.** A reset such as `button { padding: 0 }`, `* { margin: 0 }` or `a { color: inherit }` used to lose to Psi's class selectors and now wins: an unlayered `button { padding: 0 }` strips a `Button`'s padding. Move resets and element rules into a layer below Psi's, either `@layer psi.base { … }` or your own layer declared first (`@layer reset, psi.base, psi.theme, psi.components, psi.utilities;`). Deliberate component overrides can stay unlayered, and no longer need to out-specify Psi.
- **CSS in a layer of your own declared after Psi's now beats Psi's component rules**, where before it lost to them.
- **`styles.css` opens with the layer order statement**, so the five stylesheets can be imported in any order.
- **New `psi-fg-*` utilities**, one per foreground token (`psi-fg-primary`, `psi-fg-secondary`, `psi-fg-on-accent`, …), each `color: var(--psi-fg-<role>)`, in `@layer psi.utilities` and listed in `guidance.json` → `utilities`.
