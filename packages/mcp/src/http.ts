import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { PsiIndex } from "./types.js";
import { createStore } from "./store.js";
import { createPsiServer } from "./server.js";

/**
 * Stateless Streamable HTTP handler: a fresh server + transport per request,
 * no sessions, JSON responses, POST only (GET and DELETE answer 405).
 * Suitable for a Vercel function (req.body may already be parsed) and for
 * plain node:http (body read from the stream).
 */
export function createMcpHandler(index: PsiIndex) {
  const store = createStore(index);
  return async function handleMcpRequest(
    req: IncomingMessage & { body?: unknown },
    res: ServerResponse,
  ): Promise<void> {
    // Stateless: no session to end (DELETE) and nothing the server sends on
    // its own, so no standalone event stream (GET). The transport would
    // accept the GET and hold it open forever; on a serverless host that runs
    // every client's stream to the platform timeout. The spec allows 405
    // here, and clients then use POST alone.
    if (req.method !== "POST") {
      res.writeHead(405, { "content-type": "application/json", allow: "POST" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Method not allowed: this stateless server takes POST only." },
          id: null,
        }),
      );
      return;
    }
    const server = createPsiServer(store, index.version, index);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  };
}
