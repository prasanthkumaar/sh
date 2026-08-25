import assert from "node:assert/strict";
import { test } from "node:test";

import type { TradeClient } from "@tigeropenapi/tigeropen";

import { invokeTigerReadMethod } from "../src/mcp/tiger/read-gate";

function createTradeClientThatThrowsOnAccess() {
  return new Proxy(Object.create(null) as TradeClient, {
    get(_target, property) {
      throw new Error(`TradeClient property was accessed: ${String(property)}`);
    },
  });
}

test("rejects write and unknown methods before TradeClient access", async () => {
  const tradeClient = createTradeClientThatThrowsOnAccess();

  for (const method of ["placeOrder", "futureSdkMethod"]) {
    await assert.rejects(
      invokeTigerReadMethod(tradeClient, { method }),
      /not a reviewed Tiger read/,
    );
  }
});
