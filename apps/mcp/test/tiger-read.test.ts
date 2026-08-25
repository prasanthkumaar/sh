import assert from "node:assert/strict";
import { test } from "node:test";

import type { TradeClient } from "@tigeropenapi/tigeropen";

import { createTigerReader } from "../src/mcp/tiger/client";
import { performTigerRead } from "../src/mcp/tiger/read-gate";

function createTradeClientThatThrowsOnAccess() {
  return new Proxy(Object.create(null) as TradeClient, {
    get(_target, property) {
      throw new Error(`TradeClient property was accessed: ${String(property)}`);
    },
  });
}

test("rejects write and unknown methods before TradeClient access", async () => {
  const tradeClient = createTradeClientThatThrowsOnAccess();

  for (const method of ["placeOrder", "execute", "futureSdkMethod"]) {
    await assert.rejects(
      performTigerRead(tradeClient, { method, args: [] }),
      /not a reviewed Tiger read/,
    );
  }
});

test("rejects server-controlled fields at any depth before TradeClient access", async () => {
  const tradeClient = createTradeClientThatThrowsOnAccess();
  const serverControlledFields = [
    "account",
    "accountId",
    "fromAccount",
    "toAccount",
    "subAccounts",
    "tigerId",
    "privateKey",
    "secretKey",
    "token",
    "license",
    "serverUrl",
    "quoteServerUrl",
  ];

  for (const field of serverControlledFields) {
    await assert.rejects(
      performTigerRead(tradeClient, {
        method: "getAssets",
        args: [{ nested: [{ [field]: "blocked" }] }],
      }),
      /server-controlled Tiger field/,
    );
  }
});

test("allowed reads preserve the SDK receiver, arguments and result", async () => {
  const calls: Array<{
    method: string;
    args: unknown[];
    receiverIsClient: boolean;
  }> = [];
  const tradeClient = Object.create(null) as TradeClient;
  const result = [{ symbol: "AAPL" }];

  Object.defineProperty(tradeClient, "getContract", {
    value: function (this: TradeClient, ...args: unknown[]) {
      calls.push({
        method: "getContract",
        args,
        receiverIsClient: this === tradeClient,
      });
      return result;
    },
  });

  assert.equal(
    await performTigerRead(tradeClient, {
      method: "getContract",
      args: ["AAPL", "STK"],
    }),
    result,
  );
  assert.deepEqual(calls, [
    {
      method: "getContract",
      args: ["AAPL", "STK"],
      receiverIsClient: true,
    },
  ]);
});

const completeTigerEnvironment = {
  TIGER_ID: "selected-tiger-id",
  TIGER_PRIVATE_KEY_PKCS8: "selected-private-key",
  TIGER_ACCOUNT: "selected-paper-account",
  TIGER_LICENSE: "selected-license",
};

test("Tiger configuration fails closed without exposing values", () => {
  for (const missingName of Object.keys(completeTigerEnvironment)) {
    const environment: Record<string, string | undefined> = {
      ...completeTigerEnvironment,
      [missingName]: undefined,
    };
    assert.throws(
      () => createTigerReader(environment),
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        assert.match(message, new RegExp(missingName));
        assert.doesNotMatch(message, /selected-/);
        return true;
      },
    );
  }

  assert.throws(
    () =>
      createTigerReader({
        ...completeTigerEnvironment,
        TIGEROPEN_ACCOUNT: "ambient-value-must-stay-private",
      }),
    (error) => {
      const message = error instanceof Error ? error.message : String(error);
      assert.match(message, /ambient Tiger SDK configuration/);
      assert.doesNotMatch(message, /selected-|ambient-value/);
      return true;
    },
  );
});
