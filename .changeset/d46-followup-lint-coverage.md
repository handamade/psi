---
"@handamade/psi-tokens": patch
---

D46 follow-up (HAN-21): `accent-color` joins the `surface` property group in
the scope vocabulary (it was a legitimate binding stylelint couldn't name), and
the token build gains a scale-prefix guard — no semantic token's kebab name may
start with a scale-family prefix (`space-|size-|radius-|text-|font-|duration-|ease-|z-`),
closing the latent lookup-precedence shadow in both gates. llms.txt now states
precisely what the stylelint rule covers (first-party CSS) and points external
consumers at `dist/scope-map.json`.
