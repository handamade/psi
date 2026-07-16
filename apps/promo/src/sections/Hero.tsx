import { useState, type CSSProperties } from "react";
import { Button } from "@handamade/react";

const STATS = [
  "11 components",
  "22 icons",
  "4 themes",
  "0 runtime deps",
  "AA enforced at build",
];

export function Hero() {
  const [delta, setDelta] = useState(0);
  const sign = delta >= 0 ? "+" : "−";
  const label = `l ${sign} ${Math.abs(delta).toFixed(2)}`;

  return (
    <section className="hero" id="top">
      <div className="container">
        <div>
          <p className="hero-eyebrow annot annot--accent rise">
            @handamade · OKLCH design system
          </p>
          <h1 className="rise" style={{ "--rise": "0.05s" } as CSSProperties}>
            Color isn&apos;t picked.
            <br />
            It&apos;s <em>computed</em>.
          </h1>
          <p
            className="hero-lede rise"
            style={{ "--rise": "0.12s" } as CSSProperties}
          >
            DS is a themeable design system where every semantic color is an
            OKLCH formula — brand anchors in, a contrast-validated, multi-theme
            token set out. No swatch ladders. No forks per customer.
          </p>
          <div
            className="hero-ctas rise"
            style={{ "--rise": "0.19s" } as CSSProperties}
          >
            <Button
              variant="accent"
              size={48}
              onClick={() =>
                document
                  .querySelector("#components")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore the components
            </Button>
            <Button
              variant="neutral-subtle"
              size={48}
              onClick={() =>
                document
                  .querySelector("#theming")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              See theming in action
            </Button>
          </div>
          <div
            className="hero-stats rise"
            style={{ "--rise": "0.26s" } as CSSProperties}
          >
            {STATS.map((stat) => (
              <span key={stat} className="annot">
                {stat}
              </span>
            ))}
          </div>
        </div>

        <div
          className="formula-card rise"
          style={{ "--rise": "0.3s" } as CSSProperties}
        >
          <div className="formula-card-head">
            <span className="annot">themes/light.ts</span>
            <span className="annot annot--accent">→ --ds-fg-accent</span>
          </div>
          <pre aria-label="Token formula source code">
            {"fgAccent: "}
            <span className="fn">token</span>
            {"({\n  from: "}
            <span className="tok">slot.accent</span>
            {",\n  l: "}
            <span className="fn">set</span>
            {"(0.48),\n  c: "}
            <span className="fn">cap</span>
            {"(0.23),\n}),"}
          </pre>
          <div
            className="derive"
            style={{ "--delta": String(delta) } as CSSProperties}
          >
            <div className="derive-row" aria-hidden="true">
              <div className="derive-swatch derive-swatch--base">
                <span>base</span>
              </div>
              <div className="derive-swatch derive-swatch--hover">
                <span>l−0.04</span>
              </div>
              <div className="derive-swatch derive-swatch--active">
                <span>l−0.08</span>
              </div>
            </div>
            <div className="derive-controls">
              <span className="annot">{label}</span>
              <input
                type="range"
                min={-0.12}
                max={0.12}
                step={0.01}
                value={delta}
                aria-label="Lightness delta"
                onChange={(event) => setDelta(Number(event.target.value))}
              />
            </div>
            <p className="annot">
              Hover and active states are math, not extra swatches — drag Δ and
              the browser re-derives them live via oklch(from …).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
