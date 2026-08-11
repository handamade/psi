import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Readable } from "node:stream";
import handler from "../theme.js";

// A minimal stand-in for IncomingMessage: a real Readable so `for await`
// streaming and `.destroy()` (used by the oversized-body guard) both behave
// like the real thing, plus the `method` property the handler reads.
function makeReq(body: string, method = "POST"): Readable & { method?: string } {
  const req = Readable.from([Buffer.from(body, "utf8")]) as Readable & { method?: string };
  req.method = method;
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

function upstreamOk(text: string): Response {
  return {
    ok: true,
    json: async () => ({ content: [{ text }] }),
  } as unknown as Response;
}

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
