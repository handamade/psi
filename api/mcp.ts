import type { IncomingMessage, ServerResponse } from "node:http";
import { loadIndex } from "@handamade/psi-mcp";
import { createMcpHandler } from "@handamade/psi-mcp/http";

// One index + handler per warm function instance; each request still gets
// its own MCP server (stateless per spec D43). If the index load fails, the
// memo re-arms so the next request retries instead of replaying the rejection
// for the lifetime of the warm instance.
let handlerPromise: Promise<ReturnType<typeof createMcpHandler>> | null = null;

function getHandler() {
  handlerPromise ??= loadIndex()
    .then(createMcpHandler)
    .catch((err: unknown) => {
      handlerPromise = null;
      throw err;
    });
  return handlerPromise;
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
): Promise<void> {
  const handle = await getHandler();
  await handle(req, res);
}
