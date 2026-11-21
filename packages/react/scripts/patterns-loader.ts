import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pattern, PatternInput, PatternRequirement, PatternState } from "./patterns.js";

/** Loads *.json pattern files from `dir`, sorted by filename. Throws on a
 * missing/mistyped required field (id, intent, match, compose); the rest
 * default to []/{}/[]. `pattern.schema.json` (a JSON Schema sidecar, not a
 * pattern) is skipped. */
export function loadPatterns(dir: string): Pattern[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "pattern.schema.json")
    .sort();

  return files.map((file) => {
    const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, unknown>;

    if (typeof raw.id !== "string") throw new Error(`${file}: missing/invalid "id"`);
    if (typeof raw.intent !== "string") throw new Error(`${file}: missing/invalid "intent"`);
    if (!Array.isArray(raw.match)) throw new Error(`${file}: missing/invalid "match"`);
    if (typeof raw.compose !== "object" || raw.compose === null) {
      throw new Error(`${file}: missing/invalid "compose"`);
    }

    return {
      id: raw.id,
      intent: raw.intent,
      match: raw.match as string[],
      compose: raw.compose as Pattern["compose"],
      parameters: (raw.parameters as Pattern["parameters"]) ?? [],
      content: (raw.content as Pattern["content"]) ?? {},
      gaps: (raw.gaps as string[]) ?? [],
      requires: parseRequires(raw.requires, file),
      state: parseState(raw.state, file),
      inputs: parseInputs(raw.inputs, file),
    };
  });
}

/** Validates the optional `requires` array's shape. A bad entry is an
 * authoring mistake and must fail loudly at load, not resolve to nothing. */
function parseRequires(raw: unknown, file: string): PatternRequirement[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error(`${file}: "requires" must be an array`);
  return raw.map((entry, i) => {
    const e = entry as Record<string, unknown>;
    const at = `${file}: requires[${i}]`;
    if (typeof e?.content !== "string") throw new Error(`${at}: missing/invalid "content"`);
    if (e.kind !== "component" && e.kind !== "icon") {
      throw new Error(`${at}: "kind" must be "component" or "icon", got ${JSON.stringify(e.kind)}`);
    }
    if (typeof e.name !== "string") throw new Error(`${at}: missing/invalid "name"`);
    return { content: e.content, kind: e.kind, name: e.name };
  });
}

const isScalar = (v: unknown): v is string | number | boolean =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean";

/** D143: the optional `state` array. Key format is checked by
 * validatePatterns; this checks shape only. */
function parseState(raw: unknown, file: string): PatternState[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error(`${file}: "state" must be an array`);
  return raw.map((e, i) => {
    const at = `${file}: state[${i}]`;
    if (typeof e?.key !== "string") throw new Error(`${at}: missing/invalid "key"`);
    if (!isScalar(e.initial)) throw new Error(`${at}: "initial" must be a string, number or boolean`);
    return { key: e.key, initial: e.initial };
  });
}

/** D143: the optional `inputs` array. */
function parseInputs(raw: unknown, file: string): PatternInput[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error(`${file}: "inputs" must be an array`);
  return raw.map((e, i) => {
    const at = `${file}: inputs[${i}]`;
    if (typeof e?.key !== "string") throw new Error(`${at}: missing/invalid "key"`);
    if (typeof e.type !== "string") throw new Error(`${at}: missing/invalid "type"`);
    if (e.story !== undefined && !isScalar(e.story)) throw new Error(`${at}: "story" must be a string, number or boolean`);
    return e.story === undefined ? { key: e.key, type: e.type } : { key: e.key, type: e.type, story: e.story };
  });
}
