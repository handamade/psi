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
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Guards a request against being clobbered by a *later* one — reset() or
  // a fresh derive() both bump this, so a response that resolves after
  // either has happened is provably stale and is dropped. Comparing the
  // input's live text (the original approach) fails on a same-prompt
  // resubmit (both guards pass, last-to-resolve wins) and false-negatives
  // when the visitor types without submitting (a valid in-flight response
  // gets discarded for no reason) — a monotonic counter has neither problem.
  const generation = useRef(0);

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
      const myGeneration = ++generation.current;
      setPending(true);
      try {
        // 1. Local derivation renders immediately — this is the floor, not
        //    a fallback. With no API key the console is fully functional.
        const localVector = parsePrompt(prompt);
        const localApplied = applyVector(localVector, "local seed engine");

        // 2. Consult the art director concurrently — don't wait on the
        //    local transcript's typewriter delay before leaving for the
        //    network. Failure is silent and expected.
        const remotePromise = fetch("/api/theme", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt }),
          signal: AbortSignal.timeout(15_000),
        })
          .then((res) => (res.status === 200 ? res.json() : null))
          .catch(() => null);

        await localApplied;
        const remote: unknown = await remotePromise;

        // 3. Discard a stale response: a newer derive() or a reset() may
        //    have happened while this one was in flight.
        if (myGeneration !== generation.current) return;

        if (isBrandVector(remote)) await applyVector(remote, "claude");
        else await log("// art director unreachable — the local derivation stands.");
      } finally {
        // Don't let a stale request's cleanup re-enable the button after a
        // newer one has already taken over the "in flight" state.
        if (myGeneration === generation.current) setPending(false);
      }
    },
    [applyVector, log],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = inputRef.current?.value.trim();
    if (!value) return;
    derive(value).catch(() => {
      void log("// derivation failed — the previous theme stands.");
    });
  };

  // useBrand's reset() clears the brand and its storage, but the console
  // also holds the last derived pair (for the copy button) — clear that
  // here too, or "copy customers/<name>.ts" would keep offering a theme
  // that's no longer applied. Bumping `generation` invalidates any derive()
  // still in flight, so its eventual response can't silently re-apply the
  // theme this reset just cleared (Critical-1) — and un-sticking `pending`
  // lets the visitor derive again immediately rather than waiting out the
  // now-irrelevant request.
  const handleReset = useCallback(() => {
    generation.current++;
    reset();
    setPair(null);
    setPending(false);
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

  // A vector's slugified name can run to 48 chars (parsePrompt's own cap),
  // long enough on its own to overflow a 320px viewport — truncated with
  // CSS ellipsis below, so the full string lives here for `title`/
  // `aria-label` rather than the (visually clipped) rendered text.
  const copyLabel = pair ? `copy customers/${pair.vector.name}.ts` : "copy customers/….ts";

  // Re-derive and heal the cache on mount: the boot script painted from a
  // possibly-drifted cache before this module (or `generate/`) was
  // available, so re-solve from the stored vector and rewrite the cache to
  // match, so the NEXT load paints correctly pre-paint.
  useEffect(() => {
    const stored = readStoredBrand();
    if (!stored) return;
    // readStoredBrand only proves the vector's SHAPE is valid — it cannot
    // prove the vector still derives (e.g. a solver change that can no
    // longer clear AA for this hue). An uncaught throw here would run on
    // every future mount, bricking the page with the reset control
    // unreachable because it never renders. Self-heal exactly like a
    // shape-invalid vector: clear the stored brand and fall back to stock.
    try {
      const derived = deriveTheme(stored.vector);
      const member = derived[mode];
      applyCustomProperties(member.customProperties);
      setPair(derived);
      setBrand(stored.vector, member.customProperties);
    } catch {
      reset();
    }
    // Mount only — reading `mode`/`setBrand` fresh each run would re-run
    // this healing pass on every mode toggle, which Step 4 already owns.
  }, []);

  // Swap members when the mode changes: a selection, never a re-derivation.
  // No solver run, no network — `pair` already holds both members, solved
  // when the brand was derived (or healed on mount), so this only ever
  // looks one up. (Previously called `deriveTheme(brand)` here, which reran
  // the AA solver on every toggle and again once more on mount.)
  useEffect(() => {
    if (!brand || !pair) return;
    const member = pair[mode];
    applyCustomProperties(member.customProperties);
    setBrand(brand, member.customProperties);
  }, [mode, brand, pair, setBrand]);

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
            <Button type="submit" variant="accent" size={40} disabled={pending}>
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
              className="console-copy"
              disabled={!pair}
              title={copyLabel}
              aria-label={copyLabel}
              onClick={() => void handleCopy()}
            >
              <span className="console-copy-label" aria-hidden="true">
                {copyLabel}
              </span>
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
