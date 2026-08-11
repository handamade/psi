import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { Button, Input } from "@handamade/psi-react";
import {
  deriveTheme,
  isBrandVector,
  parsePrompt,
  serializeCustomerTheme,
  type BrandVector,
  type DerivedPair,
} from "@handamade/psi-tokens/generate";
import { componentCount, iconCount } from "virtual:psi-facts";
import { applyCustomProperties, readStoredBrand, useBrand, type Mode } from "../theme";

const STATS = [
  `${componentCount} components`,
  `${iconCount} icons`,
  "4 themes",
  "0 runtime deps",
  "AA enforced at build",
];

// The transcript's typewriter cadence. Zeroed under prefers-reduced-motion —
// see `log` below — so this is the only place the delay is named.
const STAGGER_MS = 90;

export function Hero({
  mode,
  onMode,
}: {
  mode: Mode;
  onMode: (mode: Mode) => void;
}) {
  const [delta, setDelta] = useState(0);
  const sign = delta >= 0 ? "+" : "−";
  const label = `l ${sign} ${Math.abs(delta).toFixed(2)}`;

  const { brand, setBrand, reset } = useBrand();
  const [pair, setPair] = useState<DerivedPair | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Push a line to the transcript. Resolves immediately when the visitor
  // asked for reduced motion; otherwise resolves after the stagger delay, so
  // callers that `await` a sequence of lines get a typewriter reveal for
  // free without any CSS animation on the lines themselves.
  const log = useCallback((line: string): Promise<void> => {
    setTranscript((lines) => [...lines, line]);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return Promise.resolve();
    }
    return new Promise((resolve) => setTimeout(resolve, STAGGER_MS));
  }, []);

  // Derives the pair once, applies the member matching the vector's mode,
  // switches the header mode to it, stores the vector plus that member's
  // properties as the cache, and logs the contrast readouts.
  const applyVector = useCallback(
    async (vector: BrandVector, source: string) => {
      const derived = deriveTheme(vector);
      const member = derived[vector.mode];
      applyCustomProperties(member.customProperties);
      onMode(vector.mode);
      setBrand(vector, member.customProperties);
      setPair(derived);
      await log(`> art direction: ${source} · "${vector.name.replace(/-/g, " ")}"`);
      await log("> applied. both modes. zero failures — by construction.");
    },
    [onMode, setBrand, log],
  );

  const derive = useCallback(
    async (prompt: string) => {
      // 1. Local derivation renders immediately — this is the floor, not a
      //    fallback. With no API key the console is fully functional.
      const localVector = parsePrompt(prompt);
      await applyVector(localVector, "local seed engine");

      // 2. Then consult the art director. Failure is silent and expected.
      let remote: unknown;
      try {
        const res = await fetch("/api/theme", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt }),
          signal: AbortSignal.timeout(15_000),
        });
        remote = res.status === 200 ? await res.json() : null;
      } catch {
        remote = null;
      }

      // 3. Discard a stale response: the visitor may have typed since.
      if (inputRef.current?.value.trim() !== prompt) return;

      if (isBrandVector(remote)) await applyVector(remote, "claude");
      else await log("// art director unreachable — the local derivation stands.");
    },
    [applyVector, log],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = inputRef.current?.value.trim();
    if (value) void derive(value);
  };

  // useBrand's reset() clears the brand and its storage, but the console
  // also holds the last derived pair (for the copy button) — clear that
  // here too, or "copy customers/<name>.ts" would keep offering a theme
  // that's no longer applied.
  const handleReset = useCallback(() => {
    reset();
    setPair(null);
  }, [reset]);

  const handleCopy = useCallback(async () => {
    if (!pair) return;
    const { filename, source } = serializeCustomerTheme(pair);
    try {
      await navigator.clipboard.writeText(source);
      await log(`> copied customers/${filename} to the clipboard.`);
    } catch {
      await log("// clipboard unavailable — copy failed.");
    }
  }, [pair, log]);

  // Re-derive and heal the cache on mount: the boot script painted from a
  // possibly-drifted cache before this module (or `generate/`) was
  // available, so re-solve from the stored vector and rewrite the cache to
  // match, so the NEXT load paints correctly pre-paint.
  useEffect(() => {
    const stored = readStoredBrand();
    if (!stored) return;
    const derived = deriveTheme(stored.vector);
    const member = derived[mode];
    applyCustomProperties(member.customProperties);
    setPair(derived);
    setBrand(stored.vector, member.customProperties);
    // Mount only — reading `mode`/`setBrand` fresh each run would re-run
    // this healing pass on every mode toggle, which Step 4 already owns.
  }, []);

  // Swap members when the mode changes: a selection, never a re-derivation.
  // No solver run, no network — both members were already solved when the
  // brand was derived.
  useEffect(() => {
    if (!brand) return;
    const member = deriveTheme(brand)[mode];
    applyCustomProperties(member.customProperties);
    setBrand(brand, member.customProperties);
  }, [mode, brand, setBrand]);

  return (
    <section className="hero" id="top">
      <div className="container">
        <div>
          <p className="hero-eyebrow annot annot--accent rise">
            @handamade · OKLCH design system
          </p>
          <h1 className="rise" style={{ "--rise": "0.05s" } as CSSProperties}>
            Color isn’t picked.
            <br />
            It’s <em>computed</em>.
          </h1>
          <p
            className="hero-lede rise"
            style={{ "--rise": "0.12s" } as CSSProperties}
          >
            Psi is a themeable design system where every semantic color is an
            OKLCH formula — brand anchors in, a contrast-validated, multi-theme
            token set out. No swatch ladders. No forks per customer.
          </p>
          <div
            className="hero-ctas rise"
            style={{ "--rise": "0.19s" } as CSSProperties}
          >
            <Button variant="accent" size={48} href="#components">
              Explore the components
            </Button>
            <Button variant="neutral-subtle" size={48} href="#theming">
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
          className="console-card rise"
          style={{ "--rise": "0.3s" } as CSSProperties}
        >
          <div className="console-head">
            <span className="annot">theme console</span>
            <span className="annot annot--accent">POST /api/theme</span>
          </div>

          <form className="console-prompt" onSubmit={handleSubmit}>
            <label className="psi-sr-only" htmlFor="brand-prompt">
              Brand brief
            </label>
            <Input
              ref={inputRef}
              id="brand-prompt"
              name="prompt"
              size={40}
              placeholder="midnight fintech, confident and calm"
              defaultValue=""
            />
            <Button type="submit" variant="accent" size={40}>
              derive
            </Button>
          </form>

          <div className="console-transcript" aria-live="polite">
            {transcript.length === 0 ? (
              <p className="annot">// type a brand brief and hit derive</p>
            ) : (
              transcript.map((line, i) => (
                <p className="annot" key={i}>
                  {line}
                </p>
              ))
            )}
          </div>

          <div
            className="derive"
            style={{ "--delta": String(delta) } as CSSProperties}
          >
            <div className="derive-row" aria-hidden="true">
              {(
                [
                  ["base", "derive-swatch--base"],
                  ["l−0.04", "derive-swatch--hover"],
                  ["l−0.08", "derive-swatch--active"],
                ] as const
              ).map(([label, cls]) => (
                <div className="derive-cell" key={cls}>
                  <div className={`derive-swatch ${cls}`} />
                  <span className="annot">{label}</span>
                </div>
              ))}
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

          <div className="console-actions">
            <Button
              variant="neutral-subtle"
              size={32}
              disabled={!pair}
              onClick={() => void handleCopy()}
            >
              copy customers/{pair ? pair.vector.name : "…"}.ts
            </Button>
            {brand !== null && (
              <Button variant="ghost" size={32} onClick={handleReset}>
                reset
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
