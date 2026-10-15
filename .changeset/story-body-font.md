---
"@handamade/psi-react": minor
---

Set the page's type at your app root (D107).

- **The consumer contract now says to set the font as well as the background.** At your app root, in `@layer psi.base`: `background: var(--psi-bg-primary)` and `color: var(--psi-fg-primary)`, `font: var(--psi-text-14-20-regular)` on `body` (never on `html`: Psi's scales are rem, so a root font size resizes every control), and `font: inherit` on native `button`, `input`, `select` and `textarea`. Components set their own type, but text you place in a `Panel`, `Dialog`, `Card` or tab panel inherits the page's, which is the browser's serif until you set it. See the README's "App root" section.
- No stylesheet changes. The Storybook stories now set the same app-root type, so they show what an app shows.
