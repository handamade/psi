import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";
import handler from "../theme.js";

/**
 * A real `IncomingMessage` over a detached socket, so `for await` streaming and
 * `.destroy()` (used by the oversized-body guard) behave like the real thing —
 * and, unlike the `Readable & { method?: string }` this used to be, it actually
 * satisfies the handler's parameter type. That mismatch was 8 TS2345 errors
 * sitting in this file, invisible because nothing type-checked `api/**` until
 * `api/tsconfig.build.json` was added to `pnpm lint`. Casting them away with
 * `as never` would have hidden the same class of bug again.
 */
function makeReq(
  body: string,
  method = "POST",
): IncomingMessage & { body?: unknown; method?: string } {
  const req = new IncomingMessage(new Socket());
  req.method = method;
  req.push(Buffer.from(body, "utf8"));
  req.push(null);
  return req;
}

interface FakeRes {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  setHeader(key: string, value: string): void;
  end(chunk?: string): void;
}

function makeRes(): FakeRes {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(chunk) {
      this.body = chunk ?? "";
    },
  };
}

const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;
const ORIGINAL_FETCH = globalThis.fetch;

function setKey(): void {
  process.env.ANTHROPIC_API_KEY = "sk-ant-placeholder-not-real";
}

function clearKey(): void {
  delete process.env.ANTHROPIC_API_KEY;
}

function stubFetch(impl: typeof fetch): void {
  globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
}

/**
 * The REAL Messages API response shape: `content` is a list of typed blocks.
 * The old stub here was `{ content: [{ text }] }` — no `type`, always exactly
 * one block — which is why the suite stayed green while every live call
 * returned 502. On Sonnet 5, omitting `thinking` runs adaptive thinking by
 * default, so `content[0]` was a `thinking` block, `content[0].text` was
 * `undefined`, and `JSON.parse("")` threw straight into
 * `502 {"error":"unparseable"}`.
 */
function upstreamOk(text: string): Response {
  return {
    ok: true,
    json: async () => ({ content: [{ type: "text", text }] }),
  } as unknown as Response;
}

/** The same reply with a `thinking` block ahead of the text block. */
function upstreamOkAfterThinking(text: string): Response {
  return {
    ok: true,
    json: async () => ({
      content: [
        { type: "thinking", thinking: "The brief reads coastal…", signature: "sig" },
        { type: "text", text },
      ],
    }),
  } as unknown as Response;
}

const VALID_VECTOR = JSON.stringify({
  hue: 200,
  chroma: "vivid",
  mode: "dark",
  radius: 8,
  name: "ok-name",
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("POST /api/theme", () => {
  it("returns 204 and never calls the upstream when no key is configured", async () => {
    clearKey();
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const res = makeRes();
    await handler(makeReq(JSON.stringify({ prompt: "sunset" })), res as never);

    expect(res.statusCode).toBe(204);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe("with a key configured", () => {
    beforeEach(() => setKey());

    it("returns 400 for a body that is not JSON", async () => {
      const res = makeRes();
      await handler(makeReq("not json at all"), res as never);
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for a body missing prompt", async () => {
      const res = makeRes();
      await handler(makeReq(JSON.stringify({})), res as never);
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for a prompt that is only whitespace", async () => {
      const res = makeRes();
      await handler(makeReq(JSON.stringify({ prompt: "   \n\t  " })), res as never);
      expect(res.statusCode).toBe(400);
    });

    it("returns 413 for a raw body over MAX_BODY_BYTES without calling the upstream", async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy as unknown as typeof fetch;

      const oversized = JSON.stringify({ prompt: "a".repeat(20 * 1024) });
      const res = makeRes();
      await handler(makeReq(oversized), res as never);

      expect(res.statusCode).toBe(413);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("rejects a prompt over MAX_PROMPT_CHARS without calling the upstream", async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy as unknown as typeof fetch;

      const res = makeRes();
      await handler(makeReq(JSON.stringify({ prompt: "a".repeat(501) })), res as never);

      expect(res.statusCode).toBe(400);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("reads the text block even when a thinking block precedes it", async () => {
      // The exact bug: `content[0]` is not the text block. Indexing position 0
      // yields `undefined` here and 502s; scanning for `type === "text"` does
      // not. This test is the one that fails if anyone reindexes.
      stubFetch(async () => upstreamOkAfterThinking(VALID_VECTOR));

      const res = makeRes();
      await handler(makeReq(JSON.stringify({ prompt: "a coastal brand" })), res as never);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({ hue: 200, chroma: "vivid" });
    });

    it("disables thinking and leaves room for the JSON object", async () => {
      // Belt to the braces above: the request that cannot produce a leading
      // thinking block in the first place. `max_tokens` bounds thinking and
      // response text together, so both halves of the fix are asserted here.
      const fetchSpy = vi.fn(async () => upstreamOk(VALID_VECTOR));
      globalThis.fetch = fetchSpy as unknown as typeof fetch;

      const res = makeRes();
      await handler(makeReq(JSON.stringify({ prompt: "sunset" })), res as never);

      expect(res.statusCode).toBe(200);
      const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
      const sent = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(sent.thinking).toEqual({ type: "disabled" });
      expect(sent.max_tokens).toBeGreaterThanOrEqual(512);
      expect(sent.model).toBe("claude-sonnet-5");
    });

    it("strips extra keys the model invents — only BrandVector fields reach the 200 body", async () => {
      stubFetch(async () =>
        upstreamOk(
          JSON.stringify({
            hue: 200,
            chroma: "vivid",
            mode: "dark",
            radius: 8,
            name: "ok-name",
            color: "#ff0000",
            evil: "payload",
          }),
        ),
      );

      const res = makeRes();
      await handler(makeReq(JSON.stringify({ prompt: "sunset over the atlantic" })), res as never);

      expect(res.statusCode).toBe(200);
      const parsed = JSON.parse(res.body) as Record<string, unknown>;
      expect(Object.keys(parsed).sort()).toEqual(["chroma", "hue", "mode", "name", "radius"]);
      expect(parsed.color).toBeUndefined();
      expect(parsed.evil).toBeUndefined();
      expect(parsed).toMatchObject({ hue: 200, chroma: "vivid", mode: "dark", radius: 8, name: "ok-name" });
    });

    it("returns 502 when the upstream reply is not JSON", async () => {
      stubFetch(async () => upstreamOk("not json"));

      const res = makeRes();
      await handler(makeReq(JSON.stringify({ prompt: "sunset" })), res as never);

      expect(res.statusCode).toBe(502);
    });

    it("returns 502 when the upstream reply is valid JSON but an invalid vector", async () => {
      stubFetch(async () => upstreamOk(JSON.stringify({ hue: 4000, chroma: "spicy" })));

      const res = makeRes();
      await handler(makeReq(JSON.stringify({ prompt: "sunset" })), res as never);

      expect(res.statusCode).toBe(502);
    });
  });
});
