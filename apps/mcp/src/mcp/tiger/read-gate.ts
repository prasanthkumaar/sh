import type { TradeClient } from "@tigeropenapi/tigeropen";

export type TigerReadRequest = {
  method: string;
  args?: unknown[];
};

type TigerSdkReadMethod = (...args: unknown[]) => unknown;

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

type TigerReadMethod = (typeof TIGER_READ_METHODS)[number];

export async function invokeTigerReadMethod(
  tradeClient: TradeClient,
  request: TigerReadRequest,
): Promise<unknown> {
  if (!isTigerReadMethod(request.method)) {
    throw new Error("Requested method is not a reviewed Tiger read");
  }

  const args = request.args ?? [];
  return (tradeClient[request.method] as TigerSdkReadMethod)(...args);
}

function isTigerReadMethod(method: string): method is TigerReadMethod {
  return TIGER_READ_METHODS.some(
    (reviewedMethod) => reviewedMethod === method,
  );
}
