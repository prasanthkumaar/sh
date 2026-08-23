import { randomUUID } from "node:crypto";

import { TradeClient } from "@tigeropenapi/tigeropen";

export const TIGER_READ_METHODS = [
  "getContract",
  "getContracts",
  "getQuoteContract",
  "previewOrder",
  "getOrders",
  "getActiveOrders",
  "getInactiveOrders",
  "getFilledOrders",
  "getOrder",
  "getOrderTransactions",
  "getPositions",
  "getAssets",
  "getPrimeAssets",
  "getManagedAccounts",
  "getDerivativeContracts",
  "getAnalyticsAsset",
  "getAggregateAssets",
  "getEstimateTradableQuantity",
  "getSegmentFundAvailable",
  "getSegmentFundHistory",
  "getFundDetails",
  "getFundingHistory",
  "getPositionTransferRecords",
  "getPositionTransferDetail",
  "getPositionTransferExternalRecords",
  "checkOptionExercise",
  "getOptionExercisePositions",
  "getOptionExerciseRecords",
] as const;

export const TIGER_WRITE_METHODS = [
  "placeOrder",
  "modifyOrder",
  "cancelOrder",
  "placeForexOrder",
  "transferSegmentFund",
  "cancelSegmentFund",
  "transferPosition",
  "submitOptionExercise",
  "cancelOptionExercise",
] as const;

export const TIGER_CREDENTIAL_METHODS = [
  "queryToken",
  "refreshToken",
  "startTokenAutoRefresh",
] as const;

export const TIGER_INTERNAL_METHODS = ["callInto", "callIntoItems"] as const;

const CLASSIFIED_TIGER_METHODS = new Set<string>([
  ...TIGER_READ_METHODS,
  ...TIGER_WRITE_METHODS,
  ...TIGER_CREDENTIAL_METHODS,
  ...TIGER_INTERNAL_METHODS,
]);

const REVIEWED_TIGER_READ_METHODS = new Set<string>(TIGER_READ_METHODS);

const SERVER_CONTROLLED_FIELDS = new Set([
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
]);

type TigerReadRequest = {
  method?: unknown;
  args?: unknown;
};

function logReviewedTigerRead(
  method: string,
  requestId: string,
  startedAt: number,
  outcome: "success" | "failure",
) {
  console.info({
    method,
    requestId,
    elapsedTimeMs: Math.round(performance.now() - startedAt),
    outcome,
  });
}

function assertSafeJsonValue(value: unknown): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      assertSafeJsonValue(item);
    }
    return;
  }

  if (typeof value !== "object") {
    throw new Error("Tiger read arguments must contain only JSON values");
  }

  for (const [field, nestedValue] of Object.entries(value)) {
    if (SERVER_CONTROLLED_FIELDS.has(field)) {
      throw new Error("Tiger read arguments contain a server-controlled Tiger field");
    }
    assertSafeJsonValue(nestedValue);
  }
}

/** Validates and delegates only methods reviewed for the pinned Tiger SDK. */
export class ReviewedTigerReadClient {
  constructor(private readonly tradeClient: TradeClient) {}

  async performReviewedRead(request: TigerReadRequest): Promise<unknown> {
    if (
      typeof request.method !== "string" ||
      !REVIEWED_TIGER_READ_METHODS.has(request.method)
    ) {
      throw new Error("Requested method is not a reviewed Tiger read");
    }

    const args = request.args ?? [];
    if (!Array.isArray(args)) {
      throw new Error("Tiger read args must be an array");
    }
    assertSafeJsonValue(args);

    const method = Reflect.get(this.tradeClient, request.method) as unknown;
    if (typeof method !== "function") {
      throw new Error("Reviewed Tiger read is unavailable");
    }

    const requestId = randomUUID();
    const startedAt = performance.now();
    try {
      const result = (await Reflect.apply(
        method,
        this.tradeClient,
        args,
      )) as unknown;
      logReviewedTigerRead(request.method, requestId, startedAt, "success");
      return result;
    } catch (error) {
      logReviewedTigerRead(request.method, requestId, startedAt, "failure");
      throw error;
    }
  }
}

/** Lists callable SDK methods that have not passed a read/write classification. */
export function listUnreviewedTradeClientMethods() {
  return Object.getOwnPropertyNames(TradeClient.prototype)
    .filter((name) => name !== "constructor")
    .filter(
      (name) => typeof Reflect.get(TradeClient.prototype, name) === "function",
    )
    .filter((name) => !CLASSIFIED_TIGER_METHODS.has(name))
    .sort();
}
