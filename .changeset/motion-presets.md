---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Motion presets (D141): a duration and an easing chosen together, named by what the motion is for. Each preset is two tokens that alias the scale, so reduced motion reaches them and a component's own motion tokens can point at either half:

- `feedback`, `--psi-motion-feedback-duration` / `-ease`: 150ms, `ease`. A control answering a pointer or a key.
- `move`, `--psi-motion-move-duration` / `-ease`: 200ms, `--psi-ease-soft`. Something entering, leaving or changing size.
- `emphasis`, `--psi-motion-emphasis-duration` / `-ease`: 350ms, `ease`. A deliberate change that draws the eye.

Every transition and animation in Psi's component CSS now binds one, with the same timing as before. The one change you could notice: `NavBar` links change colour on the `feedback` curve (`ease`) instead of `--psi-ease-soft`, like every other control. `Skeleton`'s pulse and `.psi-media-tint` stay on the raw scale.

The presets appear in `resolved/<theme>.json` (`scales.motion.presets`), the DTCG file (`motion.<name>.duration` and `.ease`, as aliases), and `guidance.json` (`motion.presets`, with each preset's intent).

The theme gate now refuses a `componentOverrides` value for a `*-duration` key that is not exactly `var(--psi-duration-<step>)` or `var(--psi-motion-<preset>-duration)`. A literal such as `200ms` never reads a duration token, so reduced motion could not zero it. The stylelint plugin gains `psi/motion-presets`, which reports a raw `--psi-duration-*` or `--psi-ease-*` in a component stylesheet's transition or animation.
