import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { PsiIndex } from "./types.js";
import { createStore } from "./store.js";
import { createPsiServer } from "./server.js";

/**
 * Stateless Streamable HTTP handler: a fresh server + transport per request,
 * no sessions, JSON responses. Suitable for a Vercel function (req.body may
 * already be parsed) and for plain node:http (body read from the stream).
 */
export function createMcpHandler(index: PsiIndex) {
  const store = createStore(index);
  return async function handleMcpRequest(
    req: IncomingMessage & { body?: unknown },
    res: ServerResponse,
  ): Promise<void> {
    const server = createPsiServer(store, index.version);
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
