#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadIndex } from "./index.js";
import { createStore } from "./store.js";
import { createPsiServer } from "./server.js";

const [command] = process.argv.slice(2);

if (command === "init") {
  const { runInit } = await import("./init.js");
  await runInit({ cwd: process.cwd(), claude: process.argv.includes("--claude") });
} else {
  const index = await loadIndex();
  const server = createPsiServer(createStore(index), index.version);
  await server.connect(new StdioServerTransport());
}
