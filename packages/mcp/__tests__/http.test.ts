import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { createMcpHandler } from "../src/http.js";
import { loadTestIndex } from "./test-index.js";

let server: Server;
let url: string;

const HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
};

function rpc(id: number, method: string, params: object) {
  return JSON.stringify({ jsonrpc: "2.0", id, method, params });
}

beforeAll(async () => {
  const index = await loadTestIndex();
  const handler = createMcpHandler(index);
  server = createServer((req, res) => void handler(req, res));
  await new Promise<void>((ok) => server.listen(0, ok));
  const addr = server.address() as { port: number };
  url = `http://127.0.0.1:${addr.port}/mcp`;
});

afterAll(() => new Promise<void>((ok) => server.close(() => ok())));

describe("streamable HTTP handler (stateless)", () => {
  it("answers initialize", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: rpc(1, "initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe("psi");
  });

  it("answers tools/call without a session (fresh server per request)", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: rpc(2, "tools/call", { name: "search", arguments: { query: "button" } }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const briefs = JSON.parse(body.result.content[0].text);
    expect(briefs[0].id).toBe("component:Button");
  });

  it("answers a get call through the handler", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: rpc(3, "tools/call", { name: "get", arguments: { id: "component:Button" } }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.content[0].text).toContain("## Examples");
  });

  it("answers a theme call through the handler", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: rpc(4, "tools/call", { name: "theme", arguments: { hue: 264, name: "ocean" } }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.content[0].text).toContain('[data-psi-theme="ocean-dark"]');
  });

  it("answers a check call through the handler", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: rpc(5, "tools/call", { name: "check", arguments: { code: '<Button size="md">x</Button>' } }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.content[0].text).toContain("invalid-value");
  });

  // A stateless server sends nothing of its own, so it offers no standalone
  // event stream. Accepting the GET held it open until the host killed it:
  // on Vercel, every client's stream ran the full 300s timeout and kept an
  // instance alive around the clock. The spec lets such a server answer 405,
  // and clients then carry on with POST alone.
  it.each(["GET", "DELETE"])("answers %s with 405 at once instead of holding a stream open", async (method) => {
    const res = await fetch(url, {
      method,
      headers: { accept: "text/event-stream" },
      // A handler that holds the stream open fails here instead of hanging the suite.
      signal: AbortSignal.timeout(2_000),
    });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
    const body = await res.json();
    expect(body).toMatchObject({ jsonrpc: "2.0", error: { code: -32000 }, id: null });
  });
});
