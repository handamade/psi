import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Store } from "./store.js";
import { ThemeError, themeMarkdown } from "./theme.js";

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

  server.registerTool(
    "theme",
    {
      title: "Make a Psi theme from a colour",
      description:
        "Derive a light and a dark Psi theme from one brand colour or a hue, solved so every " +
        "text and control pair meets WCAG AA. Returns the CSS to save, how to import it, and " +
        "the contrast of every gated pair. It never calls a model: to start from a brief such " +
        "as 'calm fintech', choose hue, chroma and radius yourself.",
      inputSchema: {
        color: z.string().optional().describe("A brand colour: a hex such as #3b82f6, or an oklch() string. Pass this or hue."),
        hue: z.number().optional().describe("OKLCH hue, 0 to 359. Pass this or color."),
        chroma: z
          .enum(["muted", "calm", "balanced", "vivid", "electric"])
          .optional()
          .describe("How saturated the accent is. From a colour, the nearest word is picked for you."),
        radius: z
          .union([z.literal(4), z.literal(6), z.literal(8), z.literal(12)])
          .optional()
          .describe("Control corner radius in px. Default 8."),
        name: z.string().optional().describe("kebab-case theme name. Default brand-<hue>."),
      },
    },
    async (input) => {
      try {
        return { content: [{ type: "text", text: themeMarkdown(input) }] };
      } catch (err) {
        if (err instanceof ThemeError) return { isError: true, content: [{ type: "text", text: err.message }] };
        throw err;
      }
    },
  );

  return server;
}
