import { readFileSync } from "node:fs";

import type { McpServer } from "@modelcontextprotocol/server";

export const TIGER_READ_CLIENT_URI = "tiger://read-client.d.ts";

/** Reads the checked-in declaration that is verified against the allowlist. */
export function readTigerReadClientDeclaration() {
  return readFileSync(new URL("./read-client.d.ts", import.meta.url), "utf8");
}

/** Registers the caller-facing declaration as a static MCP resource. */
export function registerTigerReadResource(server: McpServer) {
  server.registerResource(
    "Tiger reviewed read client",
    TIGER_READ_CLIENT_URI,
    {
      title: "Tiger reviewed read client",
      description: "TypeScript declarations for the pinned Tiger read surface",
      mimeType: "text/typescript",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/typescript",
          text: readTigerReadClientDeclaration(),
        },
      ],
    }),
  );
}
