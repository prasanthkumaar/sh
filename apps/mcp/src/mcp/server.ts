import type { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler as createMcpTransportHandler } from "mcp-handler";

import { registerTigerReadResource } from "@/src/mcp/tiger/read-resource";
import { registerEchoTool } from "@/src/mcp/tools/echo";
import {
  registerTigerReadTool,
  type TigerReadClientProvider,
} from "@/src/mcp/tools/tiger-read";

type McpDependencies = {
  getTigerReadClient?: TigerReadClientProvider;
};

/** Registers every capability exposed by the MCP server. */
export function configureMcpServer(
  server: McpServer,
  dependencies: McpDependencies = {},
) {
  registerEchoTool(server);
  registerTigerReadTool(server, dependencies.getTigerReadClient);
  registerTigerReadResource(server);
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
