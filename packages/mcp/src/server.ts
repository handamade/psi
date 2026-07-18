import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Store } from "./store.js";

export function createPsiServer(store: Store, version: string): McpServer {
  const server = new McpServer({ name: "psi", version });

  server.registerTool(
    "search",
    {
      title: "Search the Psi design system",
      description:
        "Keyword search over Psi components, semantic tokens, and guidance topics. " +
        "Returns compact briefs with ids for the get tool. Empty query returns an overview.",
      inputSchema: { query: z.string().describe("Keywords, e.g. 'button variants' or 'bg token'") },
    },
    async ({ query }) => ({
      content: [{ type: "text", text: JSON.stringify(store.search(query), null, 1) }],
    }),
  );

  server.registerTool(
    "get",
    {
      title: "Get full Psi detail by id",
      description:
        "Full detail for one id from search: component (props, defaults, a11y doc), " +
        "token (formula + resolved OKLCH/hex in all four themes), or topic (guidance). " +
        "Accepts 'component:Button', 'token:bgPrimary', 'topic:variants', or a bare name.",
      inputSchema: { id: z.string().describe("An id from search results, or a bare name") },
    },
    async ({ id }) => {
      const detail = store.get(id);
      if (!detail) {
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown id "${id}". Use the search tool to discover ids.` }],
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(detail, null, 1) }] };
    },
  );

  return server;
}
