import assert from "node:assert/strict";
import { test } from "node:test";

import {
  runTigerPaperSmoke,
  type PaperSmokeObservation,
} from "../src/mcp/tiger/paper-smoke";

test("paper smoke stops after the guard when Tiger does not report PAPER", async () => {
  const calls: unknown[] = [];
  const observations: PaperSmokeObservation[] = [];
  const configuredAccount = "controlled-configured-account";

  const paperVerified = await runTigerPaperSmoke({
    configuredAccount,
    performReviewedRead: async (request) => {
      calls.push(request);
      return [{ account: configuredAccount, accountType: "LIVE" }];
    },
    writeObservation: (observation) => observations.push(observation),
    now: () => Date.UTC(2026, 7, 24),
  });

  assert.equal(paperVerified, false);
  assert.deepEqual(calls, [{ method: "getManagedAccounts", args: [] }]);
  assert.deepEqual(observations, [
    {
      method: "getManagedAccounts",
      status: "failure",
      responseShape: "array",
      itemCount: 1,
    },
  ]);
  assert.doesNotMatch(JSON.stringify(observations), /controlled-configured-account|LIVE/);
});

test("paper smoke runs only the representative reviewed reads after the guard", async () => {
  const calls: Array<{ method?: unknown; args?: unknown }> = [];
  const observations: PaperSmokeObservation[] = [];
  const configuredAccount = "controlled-paper-account";
  const now = Date.UTC(2026, 7, 24);
  const thirtyDays = 30 * 24 * 60 * 60 * 1_000;

  const paperVerified = await runTigerPaperSmoke({
    configuredAccount,
    performReviewedRead: async (request) => {
      calls.push(request);
      switch (request.method) {
        case "getManagedAccounts":
          return [{ account: configuredAccount, accountType: "paper" }];
        case "getPrimeAssets":
          return { portfolioValue: "must-not-be-printed" };
        case "getPositions":
          return [{ positionValue: "must-not-be-printed" }];
        case "getFilledOrders":
          throw new Error("raw Tiger response must-not-be-printed");
        default:
          throw new Error("unexpected method");
      }
    },
    writeObservation: (observation) => observations.push(observation),
    now: () => now,
  });

  assert.equal(paperVerified, true);
  assert.deepEqual(calls, [
    { method: "getManagedAccounts", args: [] },
    { method: "getPrimeAssets", args: [] },
    { method: "getPositions", args: [{ secType: "STK" }] },
    { method: "getPositions", args: [{ secType: "OPT" }] },
    { method: "getPositions", args: [{ secType: "FUT" }] },
    {
      method: "getFilledOrders",
      args: [{ startDate: now - thirtyDays, endDate: now, limit: 100 }],
    },
  ]);
  assert.deepEqual(
    observations.map(({ method, status, responseShape, itemCount }) => ({
      method,
      status,
      responseShape,
      itemCount,
    })),
    [
      {
        method: "getManagedAccounts",
        status: "success",
        responseShape: "array",
        itemCount: 1,
      },
      {
        method: "getPrimeAssets",
        status: "success",
        responseShape: "object",
        itemCount: 1,
      },
      {
        method: "getPositions",
        status: "success",
        responseShape: "array",
        itemCount: 1,
      },
      {
        method: "getPositions",
        status: "success",
        responseShape: "array",
        itemCount: 1,
      },
      {
        method: "getPositions",
        status: "success",
        responseShape: "array",
        itemCount: 1,
      },
      {
        method: "getFilledOrders",
        status: "failure",
        responseShape: "error",
        itemCount: 0,
      },
    ],
  );
  assert.doesNotMatch(
    JSON.stringify(observations),
    /controlled-paper-account|STK|OPT|FUT|portfolioValue|positionValue|must-not-be-printed|raw Tiger/,
  );
});
