/** Levenshtein edit distance. */
export function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

function ranked(target: string, candidates: string[]): Array<{ c: string; d: number }> {
  const t = target.toLowerCase();
  return candidates
    .map((c) => ({ c, d: distance(t, c.toLowerCase()) }))
    .sort((x, y) => x.d - y.d || x.c.localeCompare(y.c));
}

/** The `limit` closest candidates, nearest first, however far. */
export function closest(target: string, candidates: string[], limit: number): string[] {
  return ranked(target, candidates).slice(0, limit).map((x) => x.c);
}

/** The closest candidate if it is close enough to be a typo, else null:
 * within max(2, a third of the target's length). */
export function nearest(target: string, candidates: string[]): string | null {
  const best = ranked(target, candidates)[0];
  if (!best) return null;
  return best.d <= Math.max(2, Math.floor(target.length / 3)) ? best.c : null;
}

/** The lowercase words of a camelCase or kebab-case name: onValueChange → on, value, change. */
export function words(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean);
}

/** Two names say the same thing in more or fewer words: every word of one is
 * in the other, and they share at least two (onChange ⊂ onValueChange; label
 * and dismissLabel share one, so no). */
function sameWords(a: string, b: string): boolean {
  const wa = words(a);
  const wb = words(b);
  const shared = wa.filter((w) => wb.includes(w)).length;
  return shared >= 2 && (wa.every((w) => wb.includes(w)) || wb.every((w) => wa.includes(w)));
}

/** D145: the hint for an unknown prop, in Psi's words before the DOM's:
 * 1. a close typo of the component's own prop (at most 2 edits: onClik → onClick);
 * 2. the component's own prop that says the same in more or fewer words
 *    (onValueChange → onChange, ahead of onInputChange at 4 edits);
 * 3. a looser typo of its own prop (today's threshold, `nearest`);
 * 4. a typo of a DOM attribute it passes through, within a third of the
 *    name's length (so `foo` gets nothing rather than `fr`).
 * A near DOM name never beats the component's own word for the same thing. */
export function hint(target: string, own: string[], passThrough: string[]): string | null {
  const t = target.toLowerCase();
  const byDistance = (list: string[]) => ranked(target, list);
  const close = byDistance(own)[0];
  if (close && close.d <= 2) return close.c;
  const same = own
    .filter((c) => sameWords(target, c))
    .sort((x, y) => distance(t, x.toLowerCase()) - distance(t, y.toLowerCase()) || x.localeCompare(y));
  if (same.length > 0) return same[0];
  const loose = nearest(target, own);
  if (loose) return loose;
  const dom = byDistance(passThrough)[0];
  return dom && dom.d <= Math.max(1, Math.floor(target.length / 3)) ? dom.c : null;
}
