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
