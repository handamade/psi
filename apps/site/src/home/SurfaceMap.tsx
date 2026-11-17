import type { MouseEvent } from "react";
import type { Surface } from "@handamade/psi-docs/trace";

const PEOPLE = [
  ["docs", "Docs", "/docs/components/…", 432],
  ["storybook", "Storybook", "stories · VR", 494],
  ["figma", "Figma", "variables · 4 modes", 556],
] as const;
const AGENTS = [
  ["mcp", "MCP", "four tools", 432],
  ["llms", "llms.txt", "rules · index", 494],
  ["md", "Markdown", "a .md per page", 556],
] as const;

const COLUMNS: { x: number; rows: readonly (readonly [Surface | "paper", number])[] }[] = [
  { x: 95, rows: [["docs", 432], ["storybook", 494], ["figma", 556], ["paper", 618]] },
  { x: 285, rows: [["mcp", 432], ["llms", 494], ["md", 556]] },
];
const BOX_H = 50;

export function SurfaceMap({
  current,
  onSelect,
  componentCount,
  hrefs,
}: {
  current: Surface;
  onSelect: (s: Surface) => void;
  componentCount: number;
  hrefs: Record<Surface, string>;
}) {
  const href = (s: Surface) => hrefs[s];
  const lit = (s: Surface | "paper") => (s === current ? "" : undefined);
  const on = (s: Surface) => (s === current ? "" : undefined);
  const click = (s: Surface) => (e: MouseEvent) => {
    e.preventDefault();
    onSelect(s);
  };
  const box = (s: Surface, label: string, sub: string, x: number, y: number) => (
    <g key={s} className="map-node" transform={`translate(${x},${y})`}>
      <a className="map-link" data-surface={s} data-current={on(s)} href={href(s)} onClick={click(s)}>
        <rect width="150" height="50" rx="9" />
        <text className="map-h" x="14" y="22">{label}</text>
        <text className="map-s" x="14" y="39">{sub}</text>
      </a>
    </g>
  );
  const code = current === "code";
  // Lit from Source down to the selected box: trunk, then each segment above it.
  const reach = (x: number, i: number) => {
    const col = COLUMNS.find((c) => c.x === x)!;
    const at = col.rows.findIndex(([s]) => s === current);
    return at >= i;
  };
  const wires = COLUMNS.flatMap(({ x, rows }) =>
    rows.map(([s, y], i) => {
      const d = i === 0 ? `M190,356 C190,392 ${x},384 ${x},412 L${x},${y}` : `M${x},${rows[i - 1][1] + BOX_H} L${x},${y}`;
      return <path key={s} className="map-wire" data-on={reach(x, i) ? "" : undefined} aria-hidden="true" d={d} />;
    }),
  );
  const ports = COLUMNS.flatMap(({ x, rows }) => rows.map(([s, y], i) => <circle key={s} className="map-port" data-on={reach(x, i) ? "" : undefined} cx={x} cy={y} r="3.5" />));
  return (
    <div className="map">
      <svg viewBox="0 0 380 700" role="group" aria-label="How Psi's surfaces are produced from one source">
        <g aria-hidden="true">
          <path className="map-wire" data-on="" d="M190,84 L190,124" />
          <path className="map-wire" data-on={code ? undefined : ""} d="M190,242 L190,282" />
          {wires}
          {[[190, 84, true], [190, 124, true], [190, 242, !code], [190, 282, !code], [190, 356, !code]].map(([cx, cy, o]) => (
            <circle key={String(cy)} className="map-port" data-on={o ? "" : undefined} cx={Number(cx)} cy={Number(cy)} r="3.5" />
          ))}
          {ports}
        </g>

        <g className="map-node" transform="translate(40,10)">
          <a className="map-link" data-surface="code" data-current={on("code")} href={href("code")} onClick={click("code")}>
            <rect width="300" height="74" rx="10" />
            <text className="map-cap" x="16" y="22">SOURCE</text>
            <text className="map-h" x="16" y="44">packages/react/src</text>
            <text className="map-s" x="190" y="44">{componentCount} components</text>
            <text className="map-h" x="16" y="63">packages/tokens/src</text>
            <text className="map-s" x="190" y="63">OKLCH formulas</text>
          </a>
        </g>

        <g className="map-node" transform="translate(40,124)">
          <rect width="300" height="118" rx="10" />
          <text className="map-cap" x="16" y="22">BUILD GATES</text>
          {[["WCAG AA contrast", "4 themes"], ["Token scopes", "per property"], ["Slot contracts", "what nests"], ["Visual regression", "0 px allowed"]].map(([h, s], i) => (
            <g key={h}>
              <text className="map-gate" x="16" y={46 + i * 21}>✓</text>
              <text className="map-h" x="32" y={46 + i * 21}>{h}</text>
              <text className="map-s" x="200" y={46 + i * 21}>{s}</text>
            </g>
          ))}
        </g>

        <g className="map-node" transform="translate(40,282)">
          <rect width="300" height="74" rx="10" />
          <text className="map-cap" x="16" y="22">BUILD OUTPUT</text>
          <text className="map-s map-s-strong" x="16" y="44">manifest.json · guidance.json</text>
          <text className="map-s map-s-strong" x="16" y="63">resolved/*.json · *.css · docs/*.md</text>
        </g>

        <text className="map-cap" x="20" y="418" aria-hidden="true">FOR PEOPLE</text>
        <text className="map-cap" x="210" y="418" aria-hidden="true">FOR AGENTS</text>
        {PEOPLE.map(([s, l, sub, y]) => box(s, l, sub, 20, y))}
        {AGENTS.map(([s, l, sub, y]) => box(s, l, sub, 210, y))}
        <g className="map-node map-ghost" transform="translate(20,618)">
          <rect width="150" height="50" rx="9" />
          <text className="map-h" x="14" y="22">Paper · Pencil</text>
          <text className="map-s" x="14" y="39">project C</text>
        </g>
      </svg>
      <p className="map-hint">Tap a surface to trace it.</p>
    </div>
  );
}
