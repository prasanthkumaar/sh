import type { TradeClient } from "@tigeropenapi/tigeropen";

export type TigerReadRequest = {
  method: string;
  args?: readonly unknown[];
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

export async function invokeTigerReadMethod(
  tradeClient: TradeClient,
  request: TigerReadRequest,
): Promise<unknown> {
  const isReviewedRead = TIGER_READ_METHODS.some(
    (reviewedMethod) => reviewedMethod === request.method,
  );
  if (!isReviewedRead) {
    throw new Error("Requested method is not a reviewed Tiger read");
  }

  const args = request.args ?? [];
  const sdkReadMethod = Reflect.get(
    tradeClient,
    request.method,
  ) as TigerSdkReadMethod;
  return await Reflect.apply(sdkReadMethod, tradeClient, args);
}
