/**
 * Caller-facing declarations for the reviewed reads in
 * `@tigeropenapi/tigeropen@0.5.4`.
 *
 * Invoke one method per MCP call:
 * `tiger_read({ method: "getPositions", args: [{ secType: "STK" }] })`
 * `tiger_read({ method: "getFilledOrders", args: [{ startDate: 1784908800000, endDate: 1787500800000, limit: 100 }] })`
 */
import type {
  AggregateAssets,
  AnalyticsAsset,
  Asset,
  Contract,
  EstimateTradableQuantity,
  FundDetails,
  FundingHistoryItem,
  ManagedAccount,
  OptionExerciseCheckResult,
  OptionExercisePositionPageResult,
  OptionExerciseRecordPageResult,
  Order,
  Position,
  PositionTransferDetail,
  PositionTransferExternalRecord,
  PositionTransferRecord,
  PreviewResult,
  PrimeAsset,
  SegmentFundAvailableItem,
  SegmentFundHistoryItem,
  Transaction,
} from "@tigeropenapi/tigeropen";

export interface OrderLegRequest {
  /** Profit or loss leg type. */
  legType: string;
  price?: number;
  timeInForce?: string;
  quantity?: number;
}

export interface AlgoParamsRequest {
  /** Algorithm strategy name. */
  algoStrategy?: string;
  startTime?: string;
  endTime?: string;
  participationRate?: number;
}

export interface ContractLegRequest {
  /** Contract symbol. */
  symbol?: string;
  secType?: string;
  expiry?: string;
  strike?: string;
  right?: string;
  action?: string;
  ratio?: number;
}

/** Order fields accepted by Tiger's non-mutating preview. */
export interface OrderRequest {
  /** Global order ID used by Tiger's preview model when relevant. */
  id?: number;
  /** Account-level order ID. */
  orderId?: number;
  /** BUY or SELL. */
  action: string;
  /** Order type such as MKT, LMT, STP, STP_LMT, TRAIL, TWAP or VWAP. */
  orderType: string;
  /** Total quantity. */
  totalQuantity: number;
  /** Limit price for limit-based order types. */
  limitPrice?: number;
  /** Stop or trigger price. */
  auxPrice?: number;
  /** Trailing stop percentage. */
  trailingPercent?: number;
  /** Time in force such as DAY, GTC, GTD or OPG. */
  timeInForce: string;
  /** Whether the preview includes extended-hours trading. */
  outsideRth?: boolean;
  /** Attached profit or loss legs. */
  orderLegs?: OrderLegRequest[];
  /** Algorithm-specific parameters. */
  algoParams?: AlgoParamsRequest;
  /** Contract symbol. */
  symbol: string;
  /** Security type such as STK, OPT, FUT, WAR or IOPT. */
  secType: string;
  market?: string;
  currency?: string;
  /** Option expiry. */
  expiry?: string;
  /** Option strike. */
  strike?: string;
  /** CALL or PUT. */
  right?: string;
  identifier?: string;
  remark?: string;
  userMark?: string;
  /** Iceberg order display quantity. */
  displaySize?: number;
  /** Iceberg order minimum display quantity. */
  minDisplaySize?: number;
  /** Iceberg order price-check interval in seconds. */
  checkIntervals?: number;
  /** LIMIT_PRICE, ASK_PRICE, BID_PRICE or LATEST_PRICE. */
  priceType?: string;
  /** Effective start time in milliseconds since the Unix epoch. */
  startTime?: number;
  /** Effective end time in milliseconds since the Unix epoch. */
  endTime?: number;
  /** GTD expiry time in milliseconds since the Unix epoch. */
  expireTime?: number;
  afterHoursPrice?: number;
  batchNo?: number;
  /** CASH or MARGIN. */
  segType?: string;
  /** Order amount when ordering by value. */
  amount?: number;
  /** Cash amount when ordering by value. */
  cashAmount?: number;
  /** @deprecated Set cashAmount directly. */
  isQuantityByAmount?: boolean;
  allocAccounts?: string[];
  allocShares?: number[];
  source?: string;
  channel?: string;
  virtualOrderType?: string;
  virtualId?: string;
  profitTakerOrderId?: number;
  stopLossOrderId?: number;
  localNo?: string;
  ocaOrders?: OrderRequest[];
  contractLegs?: ContractLegRequest[];
  comboType?: string;
}

export interface OrdersRequest {
  secType?: string;
  market?: string;
  symbol?: string;
  /** Start time in milliseconds since the Unix epoch. */
  startDate?: number;
  /** End time in milliseconds since the Unix epoch. */
  endDate?: number;
  limit?: number;
  isBrief?: boolean;
  /** Invalid, Initial, PendingCancel, Cancelled, Submitted, Filled, Inactive or PendingSubmit. */
  states?: string[];
  /** LATEST_CREATED or LATEST_STATUS_UPDATED. */
  sortBy?: string;
  segType?: string;
  lang?: string;
  pageToken?: string;
  /** Parent order ID filter used by getActiveOrders. */
  parentId?: number;
}

export interface GetOrderRequest {
  id?: number;
  orderId?: number;
  isBrief?: boolean;
  showCharges?: boolean;
  lang?: string;
}

export interface OrderTransactionsRequest {
  orderId?: number;
  symbol?: string;
  secType?: string;
  /** Start time in milliseconds since the Unix epoch. */
  startDate?: number;
  /** End time in milliseconds since the Unix epoch. */
  endDate?: number;
  limit?: number;
  expiry?: string;
  strike?: number;
  putCall?: string;
  lang?: string;
  pageToken?: string;
}

export interface PositionsRequest {
  secType?: string;
  currency?: string;
  market?: string;
  symbol?: string;
  expiry?: string;
  strike?: string;
  right?: string;
  assetQuoteType?: string;
  lang?: string;
}

export interface AssetsRequest {
  segment?: boolean;
  marketValue?: boolean;
  lang?: string;
}

export interface ManagedAccountsRequest {
  lang?: string;
}

export interface DerivativeContractsRequest {
  /** Underlying symbols. */
  symbols: string[];
  /** OPT, WAR or IOPT. */
  secType: string;
  expiry?: string;
  lang?: string;
}

export interface AnalyticsAssetRequest {
  segType?: string;
  /** Start date in YYYY-MM-DD format. */
  startDate?: string;
  /** End date in YYYY-MM-DD format. */
  endDate?: string;
  lang?: string;
}

export interface AggregateAssetsRequest {
  baseCurrency?: string;
  segType?: string;
  lang?: string;
}

export interface EstimateTradableQuantityRequest {
  symbol: string;
  secType: string;
  /** BUY or SELL. */
  action: string;
  orderType?: string;
  limitPrice?: number;
  market?: string;
  currency?: string;
  expiry?: string;
  strike?: string;
  right?: string;
  lang?: string;
}

export interface SegmentFundRequest {
  id?: string;
  fromSegment?: string;
  toSegment?: string;
  currency?: string;
  amount?: number;
  limit?: number;
  lang?: string;
}

export interface FundDetailsRequest {
  segTypes?: string[];
  fundType?: string;
  currency?: string;
  /** Start time in milliseconds since the Unix epoch. */
  startDate?: number;
  /** End time in milliseconds since the Unix epoch. */
  endDate?: number;
  limit?: number;
  pageToken?: string;
  lang?: string;
}

export interface FundingHistoryRequest {
  segType?: string;
  currency?: string;
  /** Start time in milliseconds since the Unix epoch. */
  startDate?: number;
  /** End time in milliseconds since the Unix epoch. */
  endDate?: number;
  limit?: number;
  lang?: string;
}

export interface PositionTransferRecordsRequest {
  sinceDate?: string;
  toDate?: string;
  market?: string;
  limit?: number;
  lang?: string;
}

export interface PositionTransferDetailRequest {
  id: string;
  lang?: string;
}

export interface PositionTransferExternalRecordsRequest {
  sinceDate?: string;
  toDate?: string;
  market?: string;
  limit?: number;
  lang?: string;
}

export interface OptionExerciseCheckRequest {
  /** Tiger option contract ID. */
  contractId: number;
  /** Exercise or Expire. */
  type: string;
  quantity?: number;
  /** Exercise date in YYYY-MM-DD format. */
  executingDate?: string;
  isForce?: boolean;
  /** Expiry in-the-money rate from 0 to 10. */
  itmRate?: number;
  lang?: string;
}

export interface OptionExercisePositionRequest {
  /** Exercise or Expire. */
  type: string;
  lang?: string;
}

export interface OptionExerciseRecordsRequest {
  /** One-based page number. Defaults to 1. */
  page?: number;
  /** Page size from 1 to 100. Defaults to 20. */
  size?: number;
  /** New, Cancel, Success or Fail. */
  status?: string;
  /** Exercise or Expire. */
  type?: string;
  symbol?: string;
  /** symbol, expire_date, strike or is_call. */
  orderBy?: string;
  lang?: string;
}

/** The complete reviewed read surface for the pinned SDK. */
export interface TigerReadClient {
  /** Query contracts matching one symbol and security type. */
  getContract(symbol: string, secType: string): Promise<Contract[]>;
  /** Query contracts matching several symbols and one security type. */
  getContracts(symbols: string[], secType: string): Promise<Contract[]>;
  /** Query derivative contracts for an underlying and YYYYMMDD expiry. */
  getQuoteContract(symbol: string, secType: string, expiry: string): Promise<Contract[]>;
  /** Preview an order without submitting it. */
  previewOrder(order: OrderRequest): Promise<PreviewResult | undefined>;
  /** Query all historical orders, optionally filtered by an OrdersRequest. */
  getOrders(req?: OrdersRequest): Promise<Order[]>;
  /** Query active orders, optionally filtered by parent order ID. */
  getActiveOrders(req?: OrdersRequest): Promise<Order[]>;
  /** Query inactive or cancelled orders. */
  getInactiveOrders(req?: OrdersRequest): Promise<Order[]>;
  /** Query filled orders, optionally over an explicit time range. */
  getFilledOrders(req?: OrdersRequest): Promise<Order[]>;
  /** Query one order by ID. Returns undefined when no order matches. */
  getOrder(req: GetOrderRequest): Promise<Order | undefined>;
  /** Query transaction details associated with orders. */
  getOrderTransactions(req: OrderTransactionsRequest): Promise<Transaction[]>;
  /** Query positions using Tiger's optional contract filters. */
  getPositions(req?: PositionsRequest): Promise<Position[]>;
  /** Query account assets. */
  getAssets(req?: AssetsRequest): Promise<Asset[]>;
  /** Query prime-account assets. */
  getPrimeAssets(req?: AssetsRequest): Promise<PrimeAsset | undefined>;
  /** Query managed sub-accounts for supported institutional accounts. */
  getManagedAccounts(req?: ManagedAccountsRequest): Promise<ManagedAccount[]>;
  /** Query derivative contracts using a full request object. */
  getDerivativeContracts(req: DerivativeContractsRequest): Promise<Contract[]>;
  /** Query daily profit, loss, net-value and holding-value analytics. */
  getAnalyticsAsset(req: AnalyticsAssetRequest): Promise<AnalyticsAsset[]>;
  /** Query aggregate prime assets by base currency. */
  getAggregateAssets(req?: AggregateAssetsRequest): Promise<AggregateAssets | undefined>;
  /** Estimate the quantity that could be traded without placing an order. */
  getEstimateTradableQuantity(req: EstimateTradableQuantityRequest): Promise<EstimateTradableQuantity | undefined>;
  /** Query the amount available for transfer between account segments. */
  getSegmentFundAvailable(req: SegmentFundRequest): Promise<SegmentFundAvailableItem[]>;
  /** Query segment-fund transfer history. */
  getSegmentFundHistory(req: SegmentFundRequest): Promise<SegmentFundHistoryItem[]>;
  /** Query fund-movement details by segment, currency and fund type. */
  getFundDetails(req: FundDetailsRequest): Promise<FundDetails[]>;
  /** Query funding history. Tiger's fixed wire method is transfer_fund. */
  getFundingHistory(req: FundingHistoryRequest): Promise<FundingHistoryItem[]>;
  /** Query internal position-transfer records. */
  getPositionTransferRecords(req: PositionTransferRecordsRequest): Promise<PositionTransferRecord[]>;
  /** Query one internal position-transfer record by ID. */
  getPositionTransferDetail(req: PositionTransferDetailRequest): Promise<PositionTransferDetail | undefined>;
  /** Query external position-transfer records such as DWAC or FOP. */
  getPositionTransferExternalRecords(req: PositionTransferExternalRecordsRequest): Promise<PositionTransferExternalRecord[]>;
  /** Preview the position change from exercising or expiring an option. */
  checkOptionExercise(req: OptionExerciseCheckRequest): Promise<OptionExerciseCheckResult | undefined>;
  /** Query positions that can be exercised or expired. */
  getOptionExercisePositions(req: OptionExercisePositionRequest): Promise<OptionExercisePositionPageResult | undefined>;
  /** Query option-exercise records using Tiger's paginated result. */
  getOptionExerciseRecords(req: OptionExerciseRecordsRequest): Promise<OptionExerciseRecordPageResult | undefined>;
}
