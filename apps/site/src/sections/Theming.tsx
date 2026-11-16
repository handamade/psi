import { useState, type CSSProperties } from "react";
import { Button, IconCheck, Switch, Tag } from "@handamade/psi-react";

/** The three pinned preview cards below are attribute-scoped demos, not the
 * app's live mode/brand state (Task 8's Mode is light|dark only) — so this
 * type is local to the demo, not the exported Mode. */
type PreviewTheme = "light" | "dark" | "acme";

const LIGHT_SNIPPET = `fgAccent: token({
  from: slot.accent,
  l: set(0.48),
  c: cap(0.23),
}),`;

const ACME_SNIPPET = `export const acmePalette: Palette = {
  charcoal: { l: 0.22, c: 0.015, h: 30 },
  cream:    { l: 0.96, c: 0.01,  h: 80 },
  coral:    { l: 0.55, c: 0.2,   h: 30 },
  mint:     { l: 0.52, c: 0.15,  h: 160 },
  gold:     { l: 0.78, c: 0.15,  h: 85 },
  crimson:  { l: 0.55, c: 0.22,  h: 15 },
};

export const acmeSlots: SlotMap = {
  ink: "charcoal",   canvas: "cream",
  accent: "coral",   success: "mint",
  warning: "gold",   danger: "crimson",
};`;

/** The published radius scale — packages/tokens/src/scales/radius.ts.
 *  The dial steps rungs, never free pixels: a theme sets a rung. */
const RADIUS_RUNGS = [4, 6, 8, 12] as const;
const DEFAULT_RUNG = 2; // radius-8, the --psi-control-radius default

function ThemePreview({ name, radius }: { name: PreviewTheme; radius: number }) {
  return (
    <figure className="theme-card">
      {/* The inline custom property MUST sit on this element, not a wrapper:
          components.css declares --psi-control-radius under
          :where(:root, [data-psi-theme]), so this node re-declares the
          default on itself and would override anything inherited. */}
      <div
        className="theme-card-ui"
        data-psi-theme={name}
        style={
          { "--psi-control-radius": `var(--psi-radius-${radius})` } as CSSProperties
        }
      >
        <header>
          <strong>Invoices</strong>
          <Tag variant="success" subtle>
            Paid
          </Tag>
        </header>
        <p>Q3 retainer — Acme Corp. Due in 14 days.</p>
        <div className="row">
          <Switch defaultChecked>Auto-remind</Switch>
          <Button variant="accent">New invoice</Button>
        </div>
      </div>
      <figcaption className="annot">
        data-psi-theme=&quot;{name}&quot; · --psi-control-radius: radius-
        {radius}
      </figcaption>
    </figure>
  );
}

export function Theming() {
  // Annotated: DEFAULT_RUNG has the literal type 2, and an explicit <number>
  // keeps setRung from narrowing to it.
  const [rung, setRung] = useState<number>(DEFAULT_RUNG);
  const radius = RADIUS_RUNGS[rung];

  return (
    <section className="section" id="theming">
      <div className="container">
        <div className="section-head">
          <span className="annot annot--accent">03 · Theming</span>
          <h2>A customer is a theme file, not a fork.</h2>
          <p className="lede">
            The same markup, rendered three times below — each card just sets
            its own <code>data-psi-theme</code>. Semantic token names never
            change, so consuming code is theme-agnostic.
          </p>
        </div>

        <div className="shape-dial">
          <span className="annot">
            <code>--psi-control-radius</code>
          </span>
          <input
            type="range"
            min={0}
            max={RADIUS_RUNGS.length - 1}
            step={1}
            value={rung}
            aria-label="Control radius"
            aria-valuetext={`radius-${radius}`}
            onChange={(event) => setRung(Number(event.target.value))}
          />
          <output className="annot annot--accent" aria-hidden="true">
            radius-{radius}
          </output>
        </div>

        <div className="theme-grid">
          <ThemePreview name="light" radius={radius} />
          <ThemePreview name="dark" radius={radius} />
          <ThemePreview name="acme" radius={radius} />
        </div>

        <div className="theming-cols">
          <div className="code-stack">
            <div className="code-block">
              <div className="code-block-head">
                <span className="annot">
                  themes/light.ts · the shipped default
                </span>
              </div>
              <pre>{LIGHT_SNIPPET}</pre>
            </div>
            <div className="code-block">
              <div className="code-block-head">
                <span className="annot">
                  themes/customers/acme.ts · scaffolded by `pnpm new-theme
                  acme`
                </span>
              </div>
              <pre>{ACME_SNIPPET}</pre>
            </div>
          </div>
          <ul className="check-list">
            <li>
              <IconCheck size={16} aria-hidden="true" />
              <span>
                <strong>Six OKLCH anchors + six slots</strong> — that is the
                entire cost of onboarding a customer brand.
              </span>
            </li>
            <li>
              <IconCheck size={16} aria-hidden="true" />
              <span>
                <strong>…and one dial for shape.</strong> Drag it above:{" "}
                <code>
                  [data-psi-theme=&quot;acme&quot;] {"{"} --psi-control-radius:
                  var(--psi-radius-4); {"}"}
                </code>{" "}
                re-rounds every control at once. Tag and Switch stay pill on
                purpose — pill-ness is component identity, not theme
                expression.
              </span>
            </li>
            <li>
              <IconCheck size={16} aria-hidden="true" />
              <span>
                <strong>WCAG AA is a build gate, not a guideline.</strong> A
                theme committed to the repo fails the build if it fails the
                contrast matrix. A theme derived in the console can&rsquo;t
                fail it at all — every pair is solved to AA before it
                renders.
              </span>
            </li>
            <li>
              <IconCheck size={16} aria-hidden="true" />
              <span>
                <strong>Themes are attribute-scoped</strong> — nest{" "}
                <code>data-psi-theme</code> anywhere for per-surface theming,
                like the three cards above.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
