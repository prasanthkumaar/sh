import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import {
  getTigerReader,
  type TigerReader,
} from "../tiger/client";
import { TIGER_READ_METHODS } from "../tiger/read-gate";

const tigerReadInputSchema = z
  .object({
    method: z
      .enum(TIGER_READ_METHODS)
      .describe("A non-mutating TradeClient method from Tiger SDK 0.5.4"),
    args: z
      .array(z.json())
      .optional()
      .describe("The method's exact positional Tiger SDK arguments"),
  })
  .strict();

const tigerReadOutputSchema = z
  .object({
    result: z.json(),
  })
  .strict();

export function registerTigerReadTool(
  server: McpServer,
  injectedTigerReader?: TigerReader,
) {
  server.registerTool(
    "tiger_read",
    {
      title: "Tiger Read",
      description:
        "Call one non-mutating @tigeropenapi/tigeropen TradeClient method from version 0.5.4 on the configured account. Pass the method's exact positional SDK arguments in args.",
      inputSchema: tigerReadInputSchema,
      outputSchema: tigerReadOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ method, args }) => {
      try {
        const readTiger = injectedTigerReader ?? getTigerReader();
        const result = await readTiger({
          method,
          args,
        });
        return {
          content: [{ type: "text", text: "Tiger read completed" }],
          structuredContent: { result: result ?? null },
        };
      } catch {
        return {
          isError: true,
          content: [{ type: "text", text: "Tiger read request failed" }],
        };
      }
    },
  );
}
