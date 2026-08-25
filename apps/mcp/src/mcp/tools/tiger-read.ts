import type { McpServer } from "@modelcontextprotocol/server";
import { TigerError } from "@tigeropenapi/tigeropen";
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

function toCallerVisibleError(error: unknown) {
  if (error instanceof TigerError) {
    return `Tiger ${error.category} error (${error.code})`;
  }
  return "Tiger read request was rejected";
}

/** Registers the single reviewed Tiger account-read capability. */
export function registerTigerReadTool(
  server: McpServer,
  tigerReader?: TigerReader,
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
        // Resolve inside the handler so tool discovery never loads credentials.
        const performTigerRead = tigerReader ?? getTigerReader();
        const result = await performTigerRead({
          method,
          args,
        });
        return {
          content: [{ type: "text", text: "Tiger read completed" }],
          structuredContent: { result: result ?? null },
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: toCallerVisibleError(error) }],
        };
      }
    },
  );
}
