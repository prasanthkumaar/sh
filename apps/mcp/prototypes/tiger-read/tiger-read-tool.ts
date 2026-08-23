import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { TIGER_READ_METHODS, TigerReadGate } from "./read-gate";

const tigerReadInputSchema = z
  .object({
    method: z.enum(TIGER_READ_METHODS).describe("Reviewed Tiger SDK read method"),
    args: z
      .array(z.unknown())
      .optional()
      .describe("Arguments passed to that SDK method"),
  })
  .strict();

const tigerReadOutputSchema = z
  .object({
    result: z.unknown(),
  })
  .strict();

/** PROTOTYPE: registers the single proposed Tiger account-read tool. */
export function registerTigerReadPrototypeTool(
  server: McpServer,
  gate: TigerReadGate,
) {
  server.registerTool(
    "tiger_read",
    {
      title: "Tiger read",
      description:
        "Invoke one reviewed, non-mutating method from the pinned Tiger SDK",
      inputSchema: tigerReadInputSchema,
      outputSchema: tigerReadOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ method, args }) => {
      const result = (await gate.read({ method, args })) ?? null;

      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: { result },
      };
    },
  );
}
