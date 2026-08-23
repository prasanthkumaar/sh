import { TigerReadGate, type TigerReadRequest } from "./read-gate";
import { createPrototypeTigerClient } from "./tiger-client";

type Observation = {
  method: string;
  outcome: "ok" | "tiger_error";
  shape?: {
    kind: "array" | "null" | "object" | "primitive";
    count?: number;
    keys?: string[];
  };
  error?: {
    name: string;
    code?: string | number;
    reason:
      | "access_forbidden"
      | "invalid_signature"
      | "ip_not_whitelisted"
      | "unknown";
  };
};

const endDate = Date.now();
const startDate = endDate - 30 * 24 * 60 * 60 * 1_000;
const sinceDate = new Date(startDate).toISOString().slice(0, 10);
const toDate = new Date(endDate).toISOString().slice(0, 10);

const baselineReads: readonly TigerReadRequest[] = [
  { method: "getOrders", args: [{ limit: 1 }] },
  { method: "getActiveOrders", args: [{ limit: 1 }] },
  { method: "getInactiveOrders", args: [{ limit: 1 }] },
  {
    method: "getFilledOrders",
    args: [{ startDate, endDate, limit: 1 }],
  },
  { method: "getPositions", args: [{ secType: "STK" }] },
  { method: "getPositions", args: [{ secType: "OPT" }] },
  { method: "getPositions", args: [{ secType: "FUT" }] },
  { method: "getAssets", args: [{}] },
  { method: "getPrimeAssets", args: [{}] },
  { method: "getAnalyticsAsset", args: [{}] },
  { method: "getAggregateAssets", args: [{ baseCurrency: "USD" }] },
  {
    method: "getSegmentFundAvailable",
    args: [{ fromSegment: "SEC", currency: "USD" }],
  },
  { method: "getSegmentFundHistory", args: [{ limit: 1 }] },
  {
    method: "getFundDetails",
    args: [{ segTypes: ["SEC"], currency: "USD", startDate, endDate, limit: 1 }],
  },
  {
    method: "getFundingHistory",
    args: [{ segType: "SEC", currency: "USD", startDate, endDate, limit: 1 }],
  },
  {
    method: "getPositionTransferRecords",
    args: [{ sinceDate, toDate, market: "US", limit: 1 }],
  },
  {
    method: "getPositionTransferExternalRecords",
    args: [{ sinceDate, toDate, market: "US", limit: 1 }],
  },
  {
    method: "getOptionExercisePositions",
    args: [{ type: "Exercise" }],
  },
  { method: "getOptionExerciseRecords", args: [{ page: 1, size: 1 }] },
];

function describeShape(value: unknown): Observation["shape"] {
  if (Array.isArray(value)) {
    return { kind: "array", count: value.length };
  }

  if (value === null || value === undefined) {
    return { kind: "null" };
  }

  if (typeof value === "object") {
    return { kind: "object", keys: Object.keys(value).sort() };
  }

  return { kind: "primitive" };
}

function describeError(error: unknown): Observation["error"] {
  if (typeof error !== "object" || error === null) {
    return { name: "UnknownError", reason: "unknown" };
  }

  const errorRecord = error as Record<string, unknown>;
  const code = errorRecord.code;
  const message =
    typeof errorRecord.message === "string"
      ? errorRecord.message.toLowerCase()
      : "";
  const reason = message.includes("not in ip whitelist")
    ? "ip_not_whitelisted"
    : message.includes("signature") || message.includes("public key")
      ? "invalid_signature"
      : message.includes("access forbidden")
        ? "access_forbidden"
        : "unknown";

  return {
    name:
      typeof errorRecord.name === "string" ? errorRecord.name : "UnknownError",
    code:
      typeof code === "string" || typeof code === "number" ? code : undefined,
    reason,
  };
}

async function main() {
  const { account, client } = createPrototypeTigerClient();
  const managedAccounts = await client.getManagedAccounts();
  const configuredAccount = managedAccounts.find(
    (managedAccount) => managedAccount.account === account,
  );

  if (configuredAccount?.accountType?.toUpperCase() !== "PAPER") {
    throw new Error(
      "Prototype stopped: the configured Tiger account did not identify as PAPER",
    );
  }

  const gate = new TigerReadGate(client);
  const observations: Observation[] = [
    {
      method: "getManagedAccounts",
      outcome: "ok",
      shape: { kind: "array", count: managedAccounts.length },
    },
  ];

  for (const request of baselineReads) {
    try {
      const result = await gate.read(request);
      observations.push({
        method: request.method,
        outcome: "ok",
        shape: describeShape(result),
      });
    } catch (error) {
      observations.push({
        method: request.method,
        outcome: "tiger_error",
        error: describeError(error),
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        paperAccountVerified: true,
        portfolioValuesPrinted: false,
        observations,
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} catch (error) {
  console.error(
    JSON.stringify({
      paperAccountVerified: false,
      portfolioValuesPrinted: false,
      error: describeError(error),
    }),
  );
  process.exitCode = 1;
}
