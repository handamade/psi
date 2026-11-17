/** The newest entry in updates.ts: the first `date:` and the semver in the
 * first `title:`. Same reading as tools/check-docs-drift.mjs. */
export function latestRelease(source: string): { version: string; date: string } {
  const date = source.match(/date:\s*"(\d{4}-\d{2}-\d{2})"/)?.[1];
  const version = source.match(/title:\s*"(\d+\.\d+\.\d+)/)?.[1];
  if (!date || !version) throw new Error("updates.ts: no dated release entry at the top");
  return { version, date };
}
