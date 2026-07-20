# Visual regression (Playwright over built Storybook)

Screenshots every Storybook story against the built `storybook-static/` output and
diffs against committed baselines. Part of hardening cycle WS2 (D41).

## Coverage (D41 matrix)

Driven by `apps/storybook/storybook-static/index.json` (built by `pnpm build`):

- Every `type === "story"` entry is captured in the **light** and **ember** themes.
- Token-docs pages (story titles under `Tokens and Assets/*`, matched via
  `title.toLowerCase().includes("tokens")`) are additionally captured in **dark**
  and **acme**, for full 4-theme coverage of the token specimen pages.

This yields one `expect(page).toHaveScreenshot()` per (story, theme) pair, named
`${storyId}--${theme}.png`.

## Running

```sh
pnpm build   # required first: generates apps/storybook/storybook-static/
pnpm vr      # runs Playwright against the built Storybook, diffs against baselines
```

`pnpm vr` serves `storybook-static/` via `npx serve` on port 6208 and exits non-zero
on any visual diff (`maxDiffPixels: 48`, per-pixel `threshold: 0.02`).

### Why absolute maxDiffPixels and a strict threshold (HAN-20)

Two masking layers let real regressions through the old config
(`maxDiffPixelRatio: 0.001`, default `threshold: 0.2`):

- **Per-pixel threshold** was the dominant mask: the ember `fgOnAccent` AAA fix
  (#25211c → #0c0805 — every accent-button label in ember) registered **zero**
  differing pixels at threshold 0.2, and still zero at 0.1. Dark-on-dark or
  small-hue shifts — exactly the class field reports catch by eye — are
  invisible to the default. At 0.02 that change measures 54–439 diff px per
  affected story.
- **Ratio** scaled the allowance with screenshot area (~800+ px on a full-page
  shot), so tooltip-sized diffs could never reach 0.1% of the page.

Same-environment re-renders are deterministic: measured 0 diff pixels across
all stories at threshold 0. The cost of the strict config: when the CI runner
image updates its font stack, expect a mass baseline refresh (the documented
workflow below) rather than silent absorption — that trade is deliberate.

### Why `serve.json` exists

`serve`'s default `cleanUrls` behavior 301-redirects `/iframe.html?...` to `/iframe`
and drops the query string in that redirect, so every story would load with no
`id`/`theme` selected (Storybook's "No Preview" screen) and every screenshot would
be an identical blank placeholder. `serve.json` (`{"cleanUrls": false}`), passed via
`-c ../vr/serve.json` in the webServer command, disables that rewrite so `id` and
`globals` reach the Storybook preview app.

## Baselines are Linux-rendered

The committed baselines in `stories.spec.ts-snapshots/` are the CI (Linux) render —
that's the source of truth Playwright's Linux screenshot engine expects. Locally
generated baselines on macOS will differ slightly in font rendering/anti-aliasing
and are **not** what should be committed long-term (Task 11 regenerates them from
CI and that replacement is authoritative).

To refresh baselines after an intentional visual change:

1. Push the change; let the `vr` CI job run and fail on the diff.
2. Download the `vr-baselines` artifact from the failed CI run.
3. Replace the contents of `stories.spec.ts-snapshots/` with the downloaded PNGs.
4. Commit the updated baselines alongside the change that caused the diff.

Do not hand-generate baselines on a non-Linux machine and commit them as the final
answer — use `pnpm vr --update-snapshots` locally only to sanity-check that a story
renders as expected, then let CI produce the real baseline.

### Expect `pnpm vr` to fail on macOS

Playwright's default snapshot names are platform-suffixed (`...--light-linux.png`
vs `...--light-darwin.png`), so with linux baselines committed a local macOS run
finds no `-darwin` baselines and fails every test as "snapshot doesn't exist" —
that inversion is normal and not a regression. Worse, Playwright's default update
mode (`missing`) will silently WRITE 152 `-darwin.png` files into the snapshot dir
on such a run. Use `pnpm vr --update-snapshots=none` for local sanity checks, and
never commit `-darwin.png` files. CI (linux) is the only place `pnpm vr` is
expected to pass against the committed baselines.
