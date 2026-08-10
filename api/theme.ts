import type { IncomingMessage, ServerResponse } from "node:http";
import { isBrandVector, parsePrompt } from "@handamade/psi-tokens/generate";

const MODEL = "claude-sonnet-5";
const TIMEOUT_MS = 12_000;

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

async function readPrompt(req: IncomingMessage & { body?: unknown }): Promise<string | null> {
  let parsed: unknown = req.body;
  if (parsed === undefined) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    try {
      parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return null;
    }
  }
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  const prompt = (parsed as { prompt?: unknown } | null)?.prompt;
  return typeof prompt === "string" && prompt.trim().length > 0 ? prompt : null;
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

  const prompt = await readPrompt(req);
  if (prompt === null) return json(res, 400, { error: "Expected { prompt: string }" });

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
        max_tokens: 256,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!upstream.ok) return json(res, 502, { error: "upstream" });

    const payload = (await upstream.json()) as { content?: { text?: string }[] };
    const text = payload.content?.[0]?.text?.trim() ?? "";

    let candidate: unknown;
    try {
      candidate = JSON.parse(text);
    } catch {
      return json(res, 502, { error: "unparseable" });
    }

    // The model does not choose the fonts, and its name is only a suggestion:
    // fall back to the local slug so the filename is always well-formed.
    const local = parsePrompt(prompt);
    const merged = {
      ...local,
      ...(candidate as Record<string, unknown>),
      name:
        typeof (candidate as { name?: unknown }).name === "string" &&
        /^[a-z][a-z0-9-]*$/.test((candidate as { name: string }).name)
          ? (candidate as { name: string }).name
          : local.name,
      fonts: local.fonts,
    };

    if (!isBrandVector(merged)) return json(res, 502, { error: "invalid vector" });
    return json(res, 200, merged);
  } catch {
    return json(res, 502, { error: "unreachable" });
  }
}
