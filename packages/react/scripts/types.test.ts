import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// No gate type-checks test files (tsconfig.build excludes them, and vitest
// only strips types), so a type test needs the compiler itself. Each fixture
// mixes lines that must compile with lines marked @ts-expect-error; any
// diagnostic at all — including TS2578, an expect-error line that now
// compiles — fails the test (D130).
const here = dirname(fileURLToPath(import.meta.url));

function diagnosticsFor(file: string): string[] {
  const program = ts.createProgram([join(here, "type-fixtures", file), join(here, "../src/global.d.ts")], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    types: [],
  });
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => {
      const where = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : "?";
      return `${d.file?.fileName.split("/").pop()}:${where} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`;
    });
}

describe("public types (D130)", () => {
  it("Combobox narrows size and value by multiple; Select has no multiple", () => {
    expect(diagnosticsFor("combobox-select.tsx")).toEqual([]);
  }, 60_000);
});
