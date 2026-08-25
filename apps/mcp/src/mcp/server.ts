import type { McpServer } from "@modelcontextprotocol/server";
import type { TradeClient } from "@tigeropenapi/tigeropen";
import { createMcpHandler as createMcpTransportHandler } from "mcp-handler";

import { registerEchoTool } from "@/src/mcp/tools/echo";
import { registerTigerReadTool } from "@/src/mcp/tools/tiger-read";

type McpDependencies = {
  tigerClient?: TradeClient;
};

/** Registers every capability exposed by the MCP server. */
export function configureMcpServer(
  server: McpServer,
  dependencies: McpDependencies = {},
) {
  registerEchoTool(server);
  registerTigerReadTool(server, dependencies.tigerClient);
}

/** Creates the provider-neutral MCP transport handler. */
export function createMcpHandler(dependencies: McpDependencies = {}) {
  return createMcpTransportHandler(
    (server) => configureMcpServer(server, dependencies),
    {
      serverInfo: {
        name: "sh",
        version: "0.1.0",
      },
    },
  );
}
