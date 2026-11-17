import type { PsiIndex } from "../types.js";
import { runCheck, type Report } from "./rules.js";

export const MAX_CODE = 20_000;

/** Input the tool refuses outright; reported as isError. */
export class CheckInputError extends Error {}

export type CheckIndex = Pick<PsiIndex, "components" | "contracts" | "attributeSets" | "exports">;

function summary(report: Report): string[] {
  const total = [...report.checked.values()].reduce((a, b) => a + b, 0);
  const names = [...report.checked.entries()].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name));
  const out = [total === 0 ? "No Psi elements found." : `${total} Psi element${total === 1 ? "" : "s"}: ${names.join(", ")}.`];
  if (report.notChecked.size > 0) {
    out.push(`Not checked: ${[...report.notChecked.entries()].map(([tag, why]) => `${tag} (${why})`).join(", ")}.`);
  }
  if (report.skipped.length > 0) out.push(`Skipped: ${report.skipped.join("; ")}.`);
  return out;
}

/** Reports Psi components, props, values, slots and accessible names in a
 * JSX snippet that do not match the manifest. Never rewrites the code. */
export function checkMarkdown(code: string, index: CheckIndex): string {
  if (code.length > MAX_CODE) {
    throw new CheckInputError(`code is ${code.length} characters; the limit is ${MAX_CODE}.`);
  }
  const report = runCheck(code, index);
  const findings = [...report.findings].sort((a, b) => a.line - b.line || a.column - b.column);
  const head =
    findings.length === 0 ? "No problems found." : `${findings.length} problem${findings.length === 1 ? "" : "s"}.`;
  return (
    [
      "# Check",
      head,
      ...(findings.length > 0
        ? [findings.map((f) => `- \`${f.line}:${f.column}\` **${f.rule}** ${f.message}`).join("\n")]
        : []),
      "## Checked",
      summary(report).join("\n\n"),
    ].join("\n\n") + "\n"
  );
}
