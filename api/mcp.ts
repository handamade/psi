import type { IncomingMessage, ServerResponse } from "node:http";
import { loadIndex } from "@handamade/psi-mcp";
import { createMcpHandler } from "@handamade/psi-mcp/http";

// One index + handler per warm function instance; each request still gets
// its own MCP server (stateless per spec D43).
const handlerPromise = loadIndex().then(createMcpHandler);

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
): Promise<void> {
  const handle = await handlerPromise;
  await handle(req, res);
}
