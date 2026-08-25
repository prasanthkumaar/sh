import type { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler as createMcpTransportHandler } from "mcp-handler";

import type { TigerReader } from "@/src/mcp/tiger/client";
import { registerEchoTool } from "@/src/mcp/tools/echo";
import { registerTigerReadTool } from "@/src/mcp/tools/tiger-read";

type McpDependencies = {
  tigerReader?: TigerReader;
};

/** Registers every capability exposed by the MCP server. */
export function configureMcpServer(
  server: McpServer,
  dependencies: McpDependencies = {},
) {
  registerEchoTool(server);
  registerTigerReadTool(server, dependencies.tigerReader);
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
