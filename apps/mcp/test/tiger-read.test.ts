import assert from "node:assert/strict";
import { test } from "node:test";

import type { TradeClient } from "@tigeropenapi/tigeropen";

import { invokeTigerReadMethod } from "../src/mcp/tiger/read-gate";

test("rejects write and unknown methods before TradeClient access", async () => {
  const emptyTigerClient = {} as TradeClient;

  for (const method of ["placeOrder", "futureSdkMethod"]) {
    await assert.rejects(
      invokeTigerReadMethod(emptyTigerClient, { method }),
      /not a reviewed Tiger read/,
    );
  }
});
