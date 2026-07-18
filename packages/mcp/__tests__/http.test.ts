import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/index-builder.js";
import { createMcpHandler } from "../src/http.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));
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
  const index = await buildIndex({
    tokensDist: `${pkgs}tokens/dist`,
    reactDist: `${pkgs}react/dist`,
    reactDocs: `${pkgs}react/docs`,
    version: "0.0.0-test",
  });
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
});
