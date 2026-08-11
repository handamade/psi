import type { IncomingMessage, ServerResponse } from "node:http";
import {
  isBrandVector,
  parsePrompt,
  type BrandVector,
} from "@handamade/psi-tokens/generate";

const MODEL = "claude-sonnet-5";
const TIMEOUT_MS = 12_000;
/**
 * Adaptive thinking runs BY DEFAULT on Sonnet 5 when `thinking` is omitted.
 * That is what made every real call here return 502: the first content block
 * came back as `{ type: "thinking" }`, `content[0].text` read `undefined`,
 * `JSON.parse("")` threw, and the handler answered `{"error":"unparseable"}` —
 * after paying for the upstream call. This endpoint wants one small JSON
 * object, so thinking is disabled outright rather than tuned.
 */
const THINKING = { type: "disabled" } as const;
// `max_tokens` bounds thinking AND response text together. 256 was tight even
// for the bare vector; 512 is ample for the object the system prompt asks for
// and still bounds a runaway reply.
const MAX_TOKENS = 512;
// This is a public, unauthenticated endpoint that makes a billed upstream
// call per request — both bounds exist to stop someone from forcing that
// call with an unbounded body. MAX_BODY_BYTES caps the raw bytes read off
// the wire (checked while streaming, not after buffering); MAX_PROMPT_CHARS
// caps the extracted prompt text itself, after trimming.
const MAX_PROMPT_CHARS = 500; // a brand brief, not an essay
const MAX_BODY_BYTES = 16 * 1024;

/**
 * The model returns a BrandVector, never colours (D57). Every field is drawn
 * from a closed set, so an off-scale radius or an unlicensed font is
 * unrepresentable rather than merely discouraged — and the AA solver still
 * runs on the result exactly as it does on the local derivation.
 */
const SYSTEM = `You are an art director for a design system.
Given a brand brief, reply with ONLY a JSON object, no prose, no code fence:
{"hue":<0-359 integer>,"chroma":"muted"|"calm"|"balanced"|"vivid"|"electric",
 "mode":"light"|"dark","radius":4|6|8|12,"name":"<kebab-case slug>"}
hue is the OKLCH hue of the brand's accent. radius is corner sharpness:
4 is sharp/technical, 12 is soft/friendly. Choose mode from the brief's
imagery. Never include any other key.`;

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

type ReadPromptResult =
  | { ok: true; prompt: string }
  | { ok: false; status: number; error: string };

async function readPrompt(
  req: IncomingMessage & { body?: unknown },
): Promise<ReadPromptResult> {
  let parsed: unknown = req.body;
  if (parsed === undefined) {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of req) {
      const buf = chunk as Buffer;
      bytes += buf.length;
      // Bail the moment the running total crosses the cap. Buffering the
      // whole stream first and checking afterwards would still let an
      // attacker force us to read (and pay for) an unbounded body.
      if (bytes > MAX_BODY_BYTES) {
        req.destroy();
        return { ok: false, status: 413, error: "body too large" };
      }
      chunks.push(buf);
    }
    try {
      parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return { ok: false, status: 400, error: "invalid JSON" };
    }
  }
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return { ok: false, status: 400, error: "invalid JSON" };
    }
  }
  const raw = (parsed as { prompt?: unknown } | null)?.prompt;
  if (typeof raw !== "string") {
    return { ok: false, status: 400, error: "Expected { prompt: string }" };
  }
  const prompt = raw.trim();
  if (prompt.length === 0) {
    return { ok: false, status: 400, error: "Expected { prompt: string }" };
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { ok: false, status: 400, error: "prompt too long" };
  }
  return { ok: true, prompt };
}

export default async function handler(
  req: IncomingMessage & { body?: unknown; method?: string },
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  // No key configured is a normal state, not an error: the console's local
  // derivation is the floor, and the client treats 204 as "art director
  // unreachable" without surfacing a failure.
  if (!apiKey) return json(res, 204, {});

  const read = await readPrompt(req);
  if (!read.ok) return json(res, read.status, { error: read.error });
  const prompt = read.prompt;

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: THINKING,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!upstream.ok) return json(res, 502, { error: "upstream" });

    // `content` is a discriminated union of blocks, and the text block is not
    // guaranteed to be first — indexing `[0]` couples this parser to a
    // response shape the API never promised. Scan for the first `text` block
    // instead, which is correct whether or not a `thinking` block precedes it.
    const payload = (await upstream.json()) as {
      content?: { type?: string; text?: string }[];
    };
    const text =
      payload.content?.find((b) => b.type === "text")?.text?.trim() ?? "";

    let candidate: unknown;
    try {
      candidate = JSON.parse(text);
    } catch {
      return json(res, 502, { error: "unparseable" });
    }

    // The model does not choose the fonts, and its name is only a suggestion:
    // fall back to the local slug so the filename is always well-formed.
    const local = parsePrompt(prompt);
    const c = candidate as Record<string, unknown>;
    const take = <K extends keyof BrandVector>(k: K): BrandVector[K] =>
      (c[k] !== undefined ? c[k] : local[k]) as BrandVector[K];

    // Built field-by-field, never spread: a key the model invents cannot
    // reach the response body, because there is no path for it to arrive on.
    const merged: BrandVector = {
      hue: take("hue"),
      chroma: take("chroma"),
      mode: take("mode"),
      radius: take("radius"),
      // The model's name is a suggestion; the safe local slug is the default.
      // Same shape as `isBrandVector`: single interior hyphens only. The old
      // `[a-z0-9-]*` let `a--b` and `ab-` through, and `serialize.ts`'s
      // `ident()` turns those into identifiers containing a literal hyphen.
      name:
        typeof c.name === "string" && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(c.name)
          ? c.name
          : local.name,
      // Fonts are never the model's to choose.
      ...(local.fonts ? { fonts: local.fonts } : {}),
    };

    if (!isBrandVector(merged)) return json(res, 502, { error: "invalid vector" });
    return json(res, 200, merged);
  } catch {
    return json(res, 502, { error: "unreachable" });
  }
}
