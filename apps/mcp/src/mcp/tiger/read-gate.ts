import type { TradeClient } from "@tigeropenapi/tigeropen";

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
] as const satisfies readonly (keyof TradeClient)[];

export type TigerReadMethod = (typeof TIGER_READ_METHODS)[number];

const TIGER_READ_METHOD_SET = new Set<string>(TIGER_READ_METHODS);

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

export type TigerReadRequest = {
  method: string;
  args?: readonly unknown[];
};

function rejectServerControlledFields(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      rejectServerControlledFields(item);
    }
    return;
  }

  if (typeof value !== "object" || value === null) {
    return;
  }

  for (const [field, nestedValue] of Object.entries(value)) {
    if (SERVER_CONTROLLED_FIELDS.has(field)) {
      throw new Error("Tiger read arguments contain a server-controlled Tiger field");
    }
    rejectServerControlledFields(nestedValue);
  }
}

/** Validates and delegates only methods reviewed for the pinned Tiger SDK. */
export async function performTigerRead(
  tradeClient: TradeClient,
  request: TigerReadRequest,
): Promise<unknown> {
  if (!TIGER_READ_METHOD_SET.has(request.method)) {
    throw new Error("Requested method is not a reviewed Tiger read");
  }

  const args = request.args ?? [];
  rejectServerControlledFields(args);

  const method = Reflect.get(tradeClient, request.method) as unknown;
  if (typeof method !== "function") {
    throw new Error("Reviewed Tiger read is unavailable");
  }

  return (await Reflect.apply(method, tradeClient, args)) as unknown;
}
