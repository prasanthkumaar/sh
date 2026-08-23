import type { McpServer } from "@modelcontextprotocol/server";
import { TigerError } from "@tigeropenapi/tigeropen";
import { z } from "zod";

import { getReviewedTigerReadClient } from "../tiger/client";
import {
  TIGER_READ_METHODS,
  type ReviewedTigerReadClient,
} from "../tiger/read-gate";

const tigerReadInputSchema = z
  .object({
    method: z.enum(TIGER_READ_METHODS),
    args: z.array(z.json()).optional(),
  })
  .strict();

const tigerReadOutputSchema = z
  .object({
    result: z.json(),
  })
  .strict();

export type TigerReadClientProvider = () => Pick<
  ReviewedTigerReadClient,
  "performReviewedRead"
>;

function toCallerVisibleError(error: unknown) {
  if (error instanceof TigerError) {
    return `Tiger ${error.category} error (${error.code})`;
  }
  return "Tiger read request was rejected";
}

/** Registers the single reviewed Tiger account-read capability. */
export function registerTigerReadTool(
  server: McpServer,
  getTigerReadClient: TigerReadClientProvider = getReviewedTigerReadClient,
) {
  server.registerTool(
    "tiger_read",
    {
      title: "Tiger Read",
      description: "Invoke one reviewed read on the configured Tiger account",
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
        const result = await getTigerReadClient().performReviewedRead({
          method,
          args,
        });
        const structuredContent = {
          result: result === undefined ? null : result,
        };
        return {
          content: [{ type: "text", text: "Tiger read completed" }],
          structuredContent,
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
