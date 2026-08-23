import assert from "node:assert/strict";
import { test } from "node:test";

import { TigerError, type TradeClient } from "@tigeropenapi/tigeropen";

import { createReviewedTigerReadClient } from "../src/mcp/tiger/client";
import {
  ReviewedTigerReadClient,
  TIGER_CREDENTIAL_METHODS,
  TIGER_INTERNAL_METHODS,
  TIGER_READ_METHODS,
  TIGER_WRITE_METHODS,
  listUnreviewedTradeClientMethods,
} from "../src/mcp/tiger/read-gate";
import { readTigerReadClientDeclaration } from "../src/mcp/tiger/read-resource";

function createTradeClientThatThrowsOnAccess() {
  return new Proxy(Object.create(null) as TradeClient, {
    get(_target, property) {
      throw new Error(`TradeClient property was accessed: ${String(property)}`);
    },
  });
}

test("the pinned TradeClient surface contains no unreviewed methods", () => {
  assert.equal(TIGER_READ_METHODS.length, 28);
  assert.equal(TIGER_WRITE_METHODS.length, 9);
  assert.equal(TIGER_CREDENTIAL_METHODS.length, 3);
  assert.equal(TIGER_INTERNAL_METHODS.length, 2);
  assert.deepEqual(listUnreviewedTradeClientMethods(), []);
});

test("rejects unreviewed methods without ever touching TradeClient", async () => {
  const reviewedClient = new ReviewedTigerReadClient(
    createTradeClientThatThrowsOnAccess(),
  );
  const unavailableMethods = [
    ...TIGER_WRITE_METHODS,
    ...TIGER_CREDENTIAL_METHODS,
    ...TIGER_INTERNAL_METHODS,
    "execute",
    "futureSdkMethod",
  ];

  for (const method of unavailableMethods) {
    await assert.rejects(
      reviewedClient.performReviewedRead({ method, args: [] }),
      /not a reviewed Tiger read/,
    );
  }
});

test("rejects server-controlled fields at any depth before TradeClient access", async () => {
  const reviewedClient = new ReviewedTigerReadClient(
    createTradeClientThatThrowsOnAccess(),
  );
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
    const argumentCases = [
      [{ [field]: "blocked" }],
      [{ nested: [{ [field]: "blocked" }] }],
    ];
    for (const args of argumentCases) {
      await assert.rejects(
        reviewedClient.performReviewedRead({ method: "getAssets", args }),
        /server-controlled Tiger field/,
      );
    }
  }
});

test("reviewed reads preserve SDK calls and log no arguments or results", async () => {
  const calls: Array<{
    method: string;
    args: unknown[];
    receiverIsClient: boolean;
  }> = [];
  const tradeClient = Object.create(null) as TradeClient;
  const results = {
    getOrders: [{ safeShape: "orders" }],
    getPositions: [{ safeShape: "positions" }],
    getContract: [{ safeShape: "contracts" }],
  };

  for (const method of ["getOrders", "getPositions", "getContract"] as const) {
    Object.defineProperty(tradeClient, method, {
      value: function (this: TradeClient, ...args: unknown[]) {
        calls.push({
          method,
          args,
          receiverIsClient: this === tradeClient,
        });
        return results[method];
      },
    });
  }

  const logs: unknown[][] = [];
  const originalConsoleInfo = console.info;
  console.info = (...entries: unknown[]) => logs.push(entries);
  try {
    const reviewedClient = new ReviewedTigerReadClient(tradeClient);
    const positionFilter = { secType: "STK" };

    assert.equal(
      await reviewedClient.performReviewedRead({ method: "getOrders" }),
      results.getOrders,
    );
    assert.equal(
      await reviewedClient.performReviewedRead({
        method: "getPositions",
        args: [positionFilter],
      }),
      results.getPositions,
    );
    assert.equal(
      await reviewedClient.performReviewedRead({
        method: "getContract",
        args: ["AAPL", "STK"],
      }),
      results.getContract,
    );
  } finally {
    console.info = originalConsoleInfo;
  }

  assert.deepEqual(calls, [
    { method: "getOrders", args: [], receiverIsClient: true },
    {
      method: "getPositions",
      args: [{ secType: "STK" }],
      receiverIsClient: true,
    },
    {
      method: "getContract",
      args: ["AAPL", "STK"],
      receiverIsClient: true,
    },
  ]);
  assert.equal(logs.length, 3);
  const serialisedLogs = JSON.stringify(logs);
  assert.doesNotMatch(
    serialisedLogs,
    /AAPL|STK|safeShape|orders|positions|contracts/,
  );
  assert.match(serialisedLogs, /getOrders/);
  assert.match(serialisedLogs, /success/);
});

test("reviewed reads preserve safe Tiger errors without logging their details", async () => {
  const tigerError = new TigerError(5, "controlled Tiger rate limit");
  const tradeClient = Object.create(null) as TradeClient;
  Object.defineProperty(tradeClient, "getAssets", {
    value: () => Promise.reject(tigerError),
  });
  const logs: unknown[][] = [];
  const originalConsoleInfo = console.info;
  console.info = (...entries: unknown[]) => logs.push(entries);

  try {
    const reviewedClient = new ReviewedTigerReadClient(tradeClient);
    await assert.rejects(
      reviewedClient.performReviewedRead({ method: "getAssets" }),
      (error) => error === tigerError,
    );
  } finally {
    console.info = originalConsoleInfo;
  }

  assert.match(JSON.stringify(logs), /getAssets/);
  assert.match(JSON.stringify(logs), /failure/);
  assert.doesNotMatch(JSON.stringify(logs), /rate limit|controlled/);
});

const completeTigerEnvironment = {
  TIGER_ID: "selected-tiger-id",
  TIGER_PRIVATE_KEY_PKCS8: "selected-private-key",
  TIGER_ACCOUNT: "selected-paper-account",
  TIGER_LICENSE: "selected-license",
};

test("missing Tiger configuration fails closed without exposing values", () => {
  for (const missingName of Object.keys(completeTigerEnvironment)) {
    const environment: Record<string, string | undefined> = {
      ...completeTigerEnvironment,
      [missingName]: undefined,
    };

    assert.throws(
      () => createReviewedTigerReadClient(environment),
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        assert.match(message, new RegExp(missingName));
        assert.doesNotMatch(message, /selected-/);
        return true;
      },
    );
  }
});

test("ambient Tiger SDK overrides fail closed without exposing either value", () => {
  const ambientNames = [
    "TIGEROPEN_TIGER_ID",
    "TIGEROPEN_PRIVATE_KEY",
    "TIGEROPEN_ACCOUNT",
    "TIGEROPEN_SECRET_KEY",
    "TIGEROPEN_TOKEN",
    "TIGEROPEN_TOKEN_FILE",
    "TIGEROPEN_TIGER_PUBLIC_KEY",
    "TIGEROPEN_SERVER_URL",
    "TIGEROPEN_QUOTE_SERVER_URL",
  ];

  for (const ambientName of ambientNames) {
    const environment = {
      ...completeTigerEnvironment,
      [ambientName]: "ambient-value-must-stay-private",
    };
    assert.throws(
      () => createReviewedTigerReadClient(environment),
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        assert.match(message, /ambient Tiger SDK configuration/);
        assert.doesNotMatch(message, /selected-|ambient-value/);
        return true;
      },
    );
  }
});

test("the Tiger TypeScript resource matches the runtime reviewed catalogue", () => {
  const declaration = readTigerReadClientDeclaration();
  const declaredMethods = [
    ...declaration.matchAll(/^  (\w+)\([^)]*\): Promise/gm),
  ]
    .map(([, method]) => method)
    .sort();

  assert.deepEqual(declaredMethods, [...TIGER_READ_METHODS].sort());
  assert.doesNotMatch(
    declaration,
    /^\s+(account|accountId|fromAccount|toAccount|subAccounts|tigerId|privateKey|secretKey|token|license|serverUrl|quoteServerUrl)\??:/gm,
  );
  assert.match(declaration, /tiger_read/);
  assert.match(declaration, /getPositions/);
  assert.match(declaration, /getFilledOrders/);
  assert.match(declaration, /Query all historical orders/);
  assert.match(declaration, /milliseconds since the Unix epoch/);
  assert.match(declaration, /Exercise or Expire/);
});
