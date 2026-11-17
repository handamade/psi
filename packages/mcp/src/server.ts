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
        "Keyword search over Psi components, composition patterns, semantic tokens, and " +
        "guidance topics. Returns compact briefs with ids for the get tool. Empty query " +
        "returns an overview.",
      inputSchema: { query: z.string().describe("Keywords, e.g. 'button variants' or 'bg token'") },
    },
    async ({ query }) => ({
      content: [{ type: "text", text: JSON.stringify(store.search(query), null, 1) }],
    }),
  );

  server.registerTool(
    "get",
    {
      title: "Get Psi docs by id",
      description:
        "The docs for one id from search, as markdown: a component's whole docs page " +
        "(examples, props, keyboard, theming, rules — the same text as " +
        "psi.kurkin.de/docs/components/<page>.md), a token page ('tokens:color'), a guide " +
        "('guide:theming'), one token ('token:bgPrimary': formula and value in every theme), " +
        "a pattern ('pattern:destructive-confirm': recipe and preset), or a topic " +
        "('topic:variants'). A bare name also works.",
      inputSchema: { id: z.string().describe("An id from search results, or a bare name") },
    },
    async ({ id }) => {
      const page = store.get(id);
      if (!page) {
        const near = store.suggest(id);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Unknown id "${id}".${near.length ? ` Nearest: ${near.join(", ")}.` : ""} Use the search tool to discover ids.`,
            },
          ],
        };
      }
      return { content: [{ type: "text", text: page.markdown }] };
    },
  );

  return server;
}
