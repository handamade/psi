// D144: the release guard's freshness checks, kept pure so they test without
// git or a file system. tools/release-guard.mjs feeds them real data.

const RUN_FILE = /^(\d{4}-\d{2}-\d{2})(?:-[a-z0-9]+)?\.md$/;
const RELEASE_TAG = /^@handamade\/psi-[a-z]+@(\d+\.\d+\.\d+)$/;
const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Newest generation-eval run by name, so `2026-08-07-b.md` beats `2026-08-07.md`.
 * Compared without the extension: "-" sorts before ".", so the full names
 * would put the suffixed run first.
 */
export function newestRun(filenames) {
  const stem = (f) => f.slice(0, -".md".length);
  const runs = filenames.filter((f) => RUN_FILE.test(f)).sort((a, b) => (stem(a) < stem(b) ? -1 : 1));
  if (runs.length === 0) return null;
  const file = runs.at(-1);
  return { file, date: file.match(RUN_FILE)[1] };
}

/**
 * Release versions from `refname<TAB>YYYY-MM-DD` lines (git for-each-ref).
 * The three packages share one version, so each version counts once, at the
 * earliest date any of its tags carries.
 */
export function releaseDates(tagLines) {
  const dates = new Map();
  for (const line of tagLines) {
    const [ref, date] = line.split("\t");
    const m = ref?.match(RELEASE_TAG);
    if (!m || !date) continue;
    const prev = dates.get(m[1]);
    if (!prev || date < prev) dates.set(m[1], date);
  }
  return dates;
}

const HOW_TO_LOG =
  "Dispatch tools/generation-eval/PROMPT.md to a fresh agent, score its report with RUBRIC.md, " +
  "and log it as tools/generation-eval/runs/<date>.md; then release.";

/**
 * Refuse when `limit` or more releases were tagged strictly after the newest
 * run's date. A release tagged the same day as a run counts as covered: runs
 * are made against what was published that day.
 */
export function evalFreshness({ runFiles, tagLines, limit }) {
  const run = newestRun(runFiles);
  if (!run) {
    return {
      ok: false,
      newest: null,
      since: Infinity,
      message: `no generation-eval run is logged in tools/generation-eval/runs/. ${HOW_TO_LOG}`,
    };
  }
  const since = [...releaseDates(tagLines).values()].filter((d) => d > run.date).length;
  const ok = since < limit;
  return {
    ok,
    newest: run.file,
    since,
    message: ok
      ? `generation eval runs/${run.file} covers this release (${since} since, limit ${limit})`
      : `the newest generation-eval run is runs/${run.file}, and ${since} releases have been tagged ` +
        `since (limit ${limit}). ${HOW_TO_LOG}`,
  };
}

function parse(version) {
  const m = typeof version === "string" ? version.match(VERSION) : null;
  return m ? m.slice(1).map(Number) : null;
}

/** Minor versions `stamp` trails `released` by; Infinity across a major. */
export function minorsBehind(stamp, released) {
  const [sMaj, sMin] = parse(stamp);
  const [rMaj, rMin] = parse(released);
  if (sMaj !== rMaj) return sMaj < rMaj ? Infinity : 0;
  return Math.max(0, rMin - sMin);
}

const STAMP = "docs/figma-library.json";

/**
 * A warning (never a refusal: code is the source of truth) when the Figma
 * library's stamp is more than one minor behind the version being released.
 */
export function figmaWarning({ stamp, released }) {
  if (!parse(stamp?.reflects)) {
    return `${STAMP} is missing or has no "reflects" version — record which Psi version the Figma library reflects.`;
  }
  const behind = minorsBehind(stamp.reflects, released);
  if (behind <= 1) return null;
  return (
    `the Figma library reflects ${stamp.reflects} (${STAMP}) and this release is ${released}. ` +
    `Update the library and its stamp after publishing, or note in the release PR why not.`
  );
}
