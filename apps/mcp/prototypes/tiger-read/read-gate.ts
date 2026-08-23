import { TradeClient } from "@tigeropenapi/tigeropen";

/**
 * PROTOTYPE: the complete reviewed read surface in Tiger SDK 0.5.4.
 * A new SDK method remains blocked until this list is reviewed and updated.
 */
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
] as const satisfies readonly (keyof TradeClient)[];

export const TIGER_CREDENTIAL_METHODS = [
  "queryToken",
  "refreshToken",
  "startTokenAutoRefresh",
] as const satisfies readonly (keyof TradeClient)[];

const TIGER_INTERNAL_METHODS = ["callInto", "callIntoItems"] as const;

const readMethods = new Set<string>(TIGER_READ_METHODS);
const serverControlledArgumentKeys = new Set([
  "account",
  "accountId",
  "fromAccount",
  "license",
  "privateKey",
  "quoteServerUrl",
  "secretKey",
  "serverUrl",
  "subAccounts",
  "tigerId",
  "toAccount",
  "token",
]);

export type TigerReadMethod = (typeof TIGER_READ_METHODS)[number];

export type TigerReadRequest = {
  method: string;
  args?: readonly unknown[];
};

function assertNoServerControlledArguments(
  value: unknown,
  path = "args",
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoServerControlledArguments(entry, `${path}[${index}]`),
    );
    return;
  }

  if (typeof value !== "object" || value === null) {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (serverControlledArgumentKeys.has(key)) {
      throw new Error(`${path}.${key} is controlled by the MCP server`);
    }

    assertNoServerControlledArguments(entry, `${path}.${key}`);
  }
}

/** The only object allowed to invoke the credential-holding Tiger client. */
export class TigerReadGate {
  constructor(private readonly client: TradeClient) {}

  async read(request: TigerReadRequest): Promise<unknown> {
    if (!readMethods.has(request.method)) {
      throw new Error(`Tiger method is not allowed: ${request.method}`);
    }

    const args = request.args ?? [];
    assertNoServerControlledArguments(args);

    const method: unknown = Reflect.get(this.client, request.method);
    if (typeof method !== "function") {
      throw new Error(`Allowed Tiger method is unavailable: ${request.method}`);
    }

    return (await Reflect.apply(method, this.client, [...args])) as unknown;
  }
}

/** Detects SDK upgrades that add an unreviewed callable method. */
export function getUnclassifiedTradeClientMethods(): string[] {
  const classifiedMethods = new Set<string>([
    ...TIGER_READ_METHODS,
    ...TIGER_WRITE_METHODS,
    ...TIGER_CREDENTIAL_METHODS,
    ...TIGER_INTERNAL_METHODS,
  ]);

  return Object.getOwnPropertyNames(TradeClient.prototype)
    .filter((name) => name !== "constructor")
    .filter((name) => !classifiedMethods.has(name));
}
