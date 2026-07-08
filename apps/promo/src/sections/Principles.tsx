const PRINCIPLES = [
  {
    title: "OKLCH calculations, not swatch ladders",
    body: (
      <>
        Semantic colors are formulas over palette anchors. Change one anchor
        and every derived state — hover, active, tint — recomputes correctly.
      </>
    ),
  },
  {
    title: "Pixel-true scale names",
    body: (
      <>
        <code>ds-gap-8</code> means 8px. Component sizes are numbers —{" "}
        <code>32</code>, <code>40</code> — never S/M/L. What you read is what
        renders.
      </>
    ),
  },
  {
    title: "Component-level tokens",
    body: (
      <>
        Every component is independently themeable via its own{" "}
        <code>--ds-*</code> variables; derived states live in code, not as
        separate styles.
      </>
    ),
  },
  {
    title: "Flat variant naming",
    body: (
      <>
        <code>accent</code>, <code>accent-subtle</code>, <code>neutral</code>{" "}
        — variants say what they are, with no primary/secondary hierarchies to
        memorize.
      </>
    ),
  },
];

export function Principles() {
  return (
    <section className="section" id="principles">
      <div className="container">
        <div className="section-head">
          <span className="annot annot--accent">01 · Principles</span>
          <h2>Four rules, applied everywhere.</h2>
        </div>
        <div className="principles-grid">
          {PRINCIPLES.map((principle, index) => (
            <article className="card principle" key={principle.title}>
              <span className="annot">0{index + 1}</span>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
