# Tiger OpenAPI research for one read-only portfolio tool

Researched on 21 August 2026. This note uses Tiger's documentation and source repositories as primary sources. No Tiger credentials or live accounts were used.

## Short answer

The tool is feasible in this Node and TypeScript repository. Tiger publishes the official TypeScript SDK `@tigeropenapi/tigeropen`, with Node 16 or newer declared in its package metadata. GitHub contains source release 0.5.5, but npm published only 0.5.4 when the prototype installed the package on 23 August 2026. The 0.5.5 changelog changes SDK-version reporting, not the reviewed method surface, so implementation should pin installable package 0.5.4 until a later version is separately reviewed. This repository already requires Node 20. The Tiger package exports typed clients and response models from its root entry point. [TypeScript SDK package](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/package.json#L1-L20) [TypeScript SDK exports](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/index.ts#L21-L67) [TypeScript SDK changelog](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/CHANGELOG.md)

Tiger does not document a per-method or read-only scope for an individual developer credential. The documented individual setup yields a Tiger ID, account number and RSA private key, with an optional IP allowlist. The SDK configuration has no operation-scope field. This is a documented-absence finding, not proof that Tiger has no private or newly added portal control. [Tiger developer setup](https://quant.itigerup.com/openapi/en/python/quickStart/prepare.html#registered-developer-information) [TypeScript client configuration](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/config/client-config.ts#L42-L96)

The read-only guarantee must therefore come from code that holds and uses the private key. Tiger's TypeScript client signs an arbitrary `method` value and sends every operation as an HTTP `POST` to the same gateway. Its generic `execute` method explicitly accepts names such as `place_order`. A hostname or path allowlist cannot distinguish portfolio reads from order writes. [HTTP signing and transport](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/client/http-client.ts#L70-L131) [Generic execute](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/client/http-client.ts#L160-L210)

## Authentication and permissions

An individual must open and fund a Tiger account, enable OpenAPI, accept the API authorisation agreement, and register developer information. Tiger then supplies a Tiger ID and account identifiers. The user keeps the RSA private key locally. Tiger says it does not retain that private key and advises regenerating it after leakage. [Tiger developer setup](https://quant.itigerup.com/openapi/en/python/quickStart/prepare.html#registered-developer-information)

The documented security controls are request signing and an optional IP allowlist. The IP allowlist limits where a credential may be used, but it does not limit which signed methods that location may call. [Tiger developer setup](https://quant.itigerup.com/openapi/en/python/quickStart/prepare.html#registered-developer-information) [TypeScript request signing](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/client/http-client.ts#L70-L105)

The common individual configuration is:

- `tigerId`, the developer identity
- `privateKey`, the RSA signing key
- `account`, the configured trading account
- `license`, when the account's licence requires it
- `token`, for licence-specific two-factor authentication

The official TypeScript SDK can read these values from options, a properties file, or `TIGEROPEN_*` environment variables. Environment variables override code and file values. [TypeScript SDK configuration](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/README.md#method-4-environment-variables) [Configuration source](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/config/client-config.ts#L31-L96)

TBHK accounts require an additional token file or token configuration. Tiger's official skill reference says that token is valid for 30 days and can be refreshed. This needs confirmation against the actual Singapore account licence before implementation. [Tiger quick-start reference](https://github.com/tigerfintech/tigeropen-skill/blob/main/skills/tigeropen/references/quickstart.md#configuration)

## Portfolio reads

Tiger puts account reads and order writes on the same `TradeClient`. The client exposes these read operations:

| Need | TypeScript method | Signed Tiger method | Notes |
| --- | --- | --- | --- |
| Determine account type | `getManagedAccounts()` | `accounts` | Returns account, type, capability and status |
| Positions | `getPositions()` | `positions` | Supports security type, currency, market and symbol filters |
| Global account assets | `getAssets()` | `assets` | Recommended for Global accounts |
| Prime or paper assets | `getPrimeAssets()` | `prime_assets` | Recommended for Prime and paper accounts |

The operation names above come directly from the official TypeScript client. [Trade client reads](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L275-L297)

`getManagedAccounts` returns `GLOBAL`, `STANDARD` or `PAPER`, so deterministic code can choose the asset endpoint instead of guessing from the account number. Tiger recommends `get_assets` for Global accounts and `get_prime_assets` for Prime and paper accounts because their asset structures differ. [Tiger account API](https://quant.itigerup.com/openapi/en/python/operation/trade/accountInfo.html#get-managed-accounts) [Tiger asset endpoint guidance](https://quant.itigerup.com/openapi/en/python/operation/trade/accountInfo.html#get-assets-get-account-summary-global-account)

The positions response can include the account, symbol, security type, market, currency, quantity, saleable quantity, average cost, market value, realised profit and loss, and unrealised profit and loss. The asset responses include cash, buying power, net liquidation and segment or currency breakdowns, depending on account type. [TypeScript position model](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/model/position.ts) [TypeScript asset models](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/model/trade.ts#L48-L114)

Tiger's account documentation says the positions call defaults to stocks. A complete portfolio may need separate `STK`, `OPT` and `FUT` calls. The prototype should test whether `ALL` is accepted and complete for the user's account before the plan relies on one positions call. [Tiger positions documentation](https://quant.itigerup.com/openapi/en/python/operation/trade/accountInfo.html#get-positions-get-positions)

There is one TypeScript SDK mismatch to test. Tiger's API documentation describes `base_currency` and `consolidated` for `prime_assets`, while the TypeScript `getPrimeAssets` method accepts the shared `AssetsRequest`, whose fields are `subAccounts`, `segment` and `marketValue`. A no-argument call may work with server defaults, but currency selection and consolidation must be verified against a paper account. [Tiger prime-assets parameters](https://quant.itigerup.com/openapi/en/python/operation/trade/accountInfo.html#get-prime-assets-account-summary-for-prime-account) [TypeScript method](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L282-L290) [TypeScript request type](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/model/trade-requests.ts#L83-L91)

## Complete current TypeScript TradeClient read catalogue

This section audits every public method in the official TypeScript `TradeClient` at GitHub source version 0.5.5 and was checked against the installable npm package 0.5.4 during the paper-account prototype. The source snapshot is Tiger commit [`b22802ad`](https://github.com/tigerfintech/openapi-typescript-sdk/tree/b22802ad82552e5464825e90074c4be1cf8b0ab3), dated 4 August 2026. Method names and signed wire names come from `trade-client.ts`; input fields come from `trade-requests.ts` and `order.ts`. [TradeClient source](https://github.com/tigerfintech/openapi-typescript-sdk/blob/b22802ad82552e5464825e90074c4be1cf8b0ab3/src/trade/trade-client.ts) [Trade request types](https://github.com/tigerfintech/openapi-typescript-sdk/blob/b22802ad82552e5464825e90074c4be1cf8b0ab3/src/model/trade-requests.ts) [Order request type](https://github.com/tigerfintech/openapi-typescript-sdk/blob/b22802ad82552e5464825e90074c4be1cf8b0ab3/src/model/order.ts#L81-L187)

Tiger applies base limits per Tiger ID and wire method on a rolling 60-second window. High-frequency methods allow 120 calls per minute, medium-frequency methods 60, and low-frequency methods 10. Upgraded accounts can have higher limits. `Unknown` below means Tiger's current rate-limit page does not list that signed method. [Current Tiger rate limits](https://docs-en.itigerup.com/docs/ratelimit)

### Private account state and history

These 21 SDK methods retrieve existing private account state or history. Tiger documents them as queries. No brokerage-state mutation is documented for any row.

Most TypeScript request objects also accept `account`, institutional `secretKey` and `lang`. They are genuine SDK inputs, but a read-only MCP contract must take the account and credential from trusted server configuration. It must not expose them as caller-controlled fields.

| TypeScript method | Signed method | Inputs and filters in TypeScript 0.5.4/0.5.5 | Pagination | Account or permission constraint | Base limit |
| --- | --- | --- | --- | --- | --- |
| `getOrders` | `orders` | Account, security type, market, symbol, start/end date, limit, brief mode, states, sort, segment, language | `pageToken` | Brief and state filters are Global-only; sort is Prime-only | 120/min |
| `getActiveOrders` | `active_orders` | Same `OrdersRequest`, plus parent order ID | `pageToken` is typed | Trading account | 120/min |
| `getInactiveOrders` | `inactive_orders` | Same `OrdersRequest` | `pageToken` is typed | Trading account | 120/min |
| `getFilledOrders` | `filled_orders` | Same `OrdersRequest` | `pageToken` is typed | Docs require start/end and cap the range at 90 days; TypeScript does not enforce either | 120/min |
| `getOrder` | `order_no` | Global ID or account-level order ID, brief mode, charge details, language | None | Account-level ID and brief mode are Global-only | 120/min |
| `getOrderTransactions` | `order_transactions` | Order ID, or symbol plus security type; start/end date, limit, option fields, language | `pageToken` is typed | Prime and paper only | 60/min |
| `getPositions` | `positions` | Security type, currency, market, symbol, sub-accounts, option fields, quote type, language | None | All documented account types; sub-accounts are institutional | 60/min |
| `getAssets` | `assets` | Sub-accounts, segment breakdown, market-value breakdown, language | None | Global recommended; Prime and paper return many empty fields | 60/min |
| `getPrimeAssets` | `prime_assets` | TypeScript incorrectly offers the `AssetsRequest` fields above | None | Prime and paper | 60/min |
| `getManagedAccounts` | `accounts` | Optional account and language | None | Returns associated accounts; institutions receive master and sub-accounts | 60/min |
| `getAnalyticsAsset` | `analytics_asset` | Segment, start/end date and language | None | No account-type restriction documented; documented sub-account filter is institutional | Unknown |
| `getAggregateAssets` | `aggregate_assets` | Base currency, segment and language | None | Asset-query permission; fields vary by account capability | 60/min |
| `getSegmentFundAvailable` | `segment_fund_available` | Source segment and currency are the relevant fields | None | Prime and paper; account must support the segment | 60/min |
| `getSegmentFundHistory` | `segment_fund_history` | Limit is the relevant field | Limit only; docs default to 100 and cap at 500 | Prime and paper | 60/min |
| `getFundDetails` | `fund_details` | Segments, fund type, currency, start/end date, limit, language | TypeScript has `pageToken` | Prime only | 10/min |
| `getFundingHistory` | `transfer_fund` | Segment, currency, start/end date, limit, language | Limit only | Records visible to configured account | 60/min |
| `getPositionTransferRecords` | `position_transfer_records` | Account ID, date range, market, limit, language | Limit only | Requires position-transfer eligibility | 60/min |
| `getPositionTransferDetail` | `position_transfer_detail` | Required transfer record ID and language | None | Requires position-transfer eligibility | 60/min |
| `getPositionTransferExternalRecords` | `position_transfer_external_records` | Account ID, date range, market, limit, language | Limit only | Requires position-transfer eligibility | 60/min |
| `getOptionExercisePositions` | `option_exercise_position` | Exercise or expire type, language | Response has page metadata, but TypeScript exposes no page controls | Requires an eligible option position | 60/min |
| `getOptionExerciseRecords` | `option_exercise_record` | Page, size, status, exercise/expire type, symbol, sort and language | Page starts at 1; size 1 to 100, default 20 | Options account with exercise records | 60/min |

Order filters, account-specific restrictions and page-token behaviour are documented on Tiger's current order page. Account types and asset restrictions are documented on the current account page. Fund and option-exercise restrictions come from their current pages. [Order information](https://docs-en.itigerup.com/docs/orderinfo) [Account information](https://docs-en.itigerup.com/docs/account-management) [Fund management](https://docs-en.itigerup.com/docs/accounts) [Position-transfer eligibility](https://docs-en.itigerup.com/docs/accounts-cs) [Option exercise](https://docs-en.itigerup.com/docs/option-exercise)

The signed name `transfer_fund` looks mutating, but the TypeScript method and Tiger's current documentation define `getFundingHistory` as a deposit and withdrawal history query. It belongs in the read allowlist only under that exact fixed mapping. The MCP input must never be allowed to supply `transfer_fund` or its payload directly. [TypeScript funding-history mapping](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L368-L375) [Tiger funding-history documentation](https://docs-en.itigerup.com/docs/accounts#get-funding-history)

### Non-mutating account calculations and previews

These three methods read current account capacity and calculate a hypothetical result. They do not retrieve existing state alone, but Tiger documents no account mutation.

| TypeScript method | Signed method | Inputs | Side-effect assessment | Base limit |
| --- | --- | --- | --- | --- |
| `previewOrder` | `preview_order` | Full order-shaped request, including instrument, side, type, quantity, price and advanced order fields | Tiger says it previews whether an order can be submitted and estimates margin and commission. It does not submit the order | Unknown |
| `getEstimateTradableQuantity` | `estimate_tradable_quantity` | Symbol, security type and action; optional order type, price, market, currency and option fields | Quantity calculation only | 60/min |
| `checkOptionExercise` | `option_exercise_check` | Contract ID, exercise/expire type, quantity, execution date, force flag and in-the-money threshold | Tiger calls this a preview to run before submission | 60/min |

[Order preview documentation](https://docs-en.itigerup.com/docs/orderinfo#preview-order) [Estimated tradable quantity](https://docs-en.itigerup.com/docs/accounts-cs#estimate-tradable-quantity) [Option exercise preview](https://docs-en.itigerup.com/docs/option-exercise-cpp#preview-an-exercise-request)

These operations are safe candidates only if the product means to expose calculations. They accept order or exercise-shaped inputs, so the initial portfolio tool should omit them. A later `tiger_read` tool could expose them as fixed query variants without exposing raw signed methods.

### Instrument and market-reference reads inside TradeClient

These four methods are non-mutating, but they return instrument or contract reference data rather than private account data.

| TypeScript method | Signed method | Inputs | Base limit |
| --- | --- | --- | --- |
| `getContract` | `contract` | One symbol and security type | 60/min |
| `getContracts` | `contracts` | Symbol list and security type | 60/min |
| `getQuoteContract` | `quote_contract` | Underlying symbol, derivative security type and expiry | 60/min |
| `getDerivativeContracts` | `quote_contract` | Symbol list, derivative security type, optional expiry and language | 60/min |

[TradeClient contract methods](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L162-L184) [Derivative alias](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L299-L305) [Rate tiers](https://docs-en.itigerup.com/docs/ratelimit)

The broader `QuoteClient` contains public market data, company data and quote-permission operations. Those methods are outside a private-account read catalogue and should not silently enter `tiger_read`. If market data is later required, catalogue and allowlist it as a separate scope decision even if it remains behind one MCP tool. [TypeScript QuoteClient source](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/quote/quote-client.ts)

### Credential lifecycle is not account reading

`queryToken`, `refreshToken` and `startTokenAutoRefresh` are not safe read variants. `queryToken` calls `user_token_refresh` and returns a new credential. `refreshToken` also changes the in-memory token and may persist it through a token manager. Auto-refresh repeats that operation. Tiger rate-limits `user_token_refresh` to 10 calls per minute. None should be callable from MCP input. [TradeClient token methods](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L106-L138) [HTTP token mutation](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/client/http-client.ts#L211-L280) [Rate tiers](https://docs-en.itigerup.com/docs/ratelimit)

### Every state-changing TradeClient method

These nine methods must remain outside the read allowlist.

| TypeScript method | Signed method | Brokerage-state change | Base limit |
| --- | --- | --- | --- |
| `placeOrder` | `place_order` | Places an order | 120/min |
| `modifyOrder` | `modify_order` | Changes an order | 120/min |
| `cancelOrder` | `cancel_order` | Cancels an order | 120/min |
| `placeForexOrder` | `place_forex_order` | Exchanges account currency | Unknown |
| `transferSegmentFund` | `transfer_segment_fund` | Moves funds between account segments | 60/min |
| `cancelSegmentFund` | `cancel_segment_fund` | Cancels a segment transfer | 60/min |
| `transferPosition` | `position_transfer` | Moves positions between accounts | 60/min |
| `submitOptionExercise` | `option_exercise_submit` | Submits an exercise or waiver request | 60/min |
| `cancelOptionExercise` | `option_exercise_cancel` | Cancels an exercise request | 60/min |

[TradeClient order writes](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L186-L204) [TradeClient fund and position writes](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L329-L359) [TradeClient position and exercise writes](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L377-L459) [Rate tiers](https://docs-en.itigerup.com/docs/ratelimit)

## TypeScript SDK and documentation gaps

The catalogue above is complete for the shared public method surface in npm 0.5.4 and GitHub source 0.5.5. It does not prove that every nominal read works or paginates completely. The following source and documentation gaps need paper-account prototypes:

1. `getPrimeAssets` accepts `AssetsRequest`, which lacks the documented `baseCurrency` and `consolidated` fields and instead offers Global-asset fields. [TypeScript source](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L282-L290) [TypeScript request](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/model/trade-requests.ts#L83-L91) [Documented request](https://docs-en.itigerup.com/docs/account-management#get-prime-assets-get-primepaper-trading-account-asset-information)
2. `getAnalyticsAsset` omits the documented `currency` and institutional `subAccount` filters. More seriously, it unwraps an array of `AnalyticsAsset`, while Tiger documents a `{summary, history}` result. This is a code-level mismatch, not a live-account failure confirmed here. [TypeScript request and response path](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L307-L317) [TypeScript request type](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/model/trade-requests.ts#L110-L128) [Documented analytics response](https://docs-en.itigerup.com/docs/account-management#get_analytics_asset-get-historical-asset-analysis)
3. `getFundDetails` types start/end dates as millisecond numbers and has `pageToken`. Tiger documents `yyyy-MM-dd` dates, a zero-based `start` offset, a default limit of 50 and a maximum of 100. The TypeScript request has no `start`. [TypeScript request](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/model/trade-requests.ts#L173-L187) [Documented request](https://docs-en.itigerup.com/docs/accounts#get-fund-details)
4. `getOrderTransactions` lacks Tiger's documented `sinceDate` and `toDate` transaction-date filters. It also makes all query fields optional, while Tiger requires either an order ID or symbol plus security type. [TypeScript request](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/model/trade-requests.ts#L48-L65) [Documented request](https://docs-en.itigerup.com/docs/orderinfo#get-order-transaction-records)
5. `getFilledOrders` inherits optional dates from `OrdersRequest`. Tiger documents both dates as required and limits the interval to 90 days. The wrapper does not enforce this. [TypeScript request](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/model/trade-requests.ts#L13-L35) [Documented filled-order constraint](https://docs-en.itigerup.com/docs/orderinfo#get-filled-orders-list)
6. Tiger documents page-token responses for orders and order transactions as `{result, next_page_token}`. TypeScript's shared `callIntoItems` accepts only a bare array or `{items}` and discards pagination metadata. The SDK types `pageToken`, but its public methods do not return a cursor-bearing response. Complete pagination through these methods is therefore not demonstrated and appears incompatible with the documented response. [TypeScript unwrapping](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L140-L160) [Order pagination](https://docs-en.itigerup.com/docs/orderinfo#get-order-list) [Transaction pagination](https://docs-en.itigerup.com/docs/orderinfo#get-order-transaction-records)
7. `getOptionExercisePositions` returns a model with page metadata, but its request type exposes only exercise type and language. There is no page or size control. [TypeScript request](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/model/trade-requests.ts#L270-L278) [Documented paginated response](https://docs-en.itigerup.com/docs/option-exercise-cpp#get-exercisable-positions)
8. Tiger's current rate page omits `analytics_asset`, `preview_order` and `place_forex_order`, so their base quotas cannot be assigned from the current primary source. [Current Tiger rate limits](https://docs-en.itigerup.com/docs/ratelimit)

The rate page also names private server methods that TypeScript `TradeClient` does not wrap, including `order_executions`, `partition_account` and `user_transactions`. Other listed transfer and withdrawal methods may be reads or writes, but the TypeScript SDK does not give them typed public methods. Calling them through generic `HttpClient.execute` would defeat the fixed read-only boundary. [Current Tiger rate method list](https://docs-en.itigerup.com/docs/ratelimit) [Generic execute](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/client/http-client.ts#L160-L210)

### What "all current private account reads" can honestly mean

For this plan, the phrase can guarantee only:

- every non-mutating private-account method publicly implemented by pinned TypeScript SDK 0.5.4 has been reviewed and mapped to a fixed signed method;
- the 21 state/history reads and three documented previews above are the complete candidate list for that pinned client;
- unknown methods, generic execution, token lifecycle, market data and all nine writes fail closed before signing.

It cannot guarantee every private read that Tiger's server supports, correct behaviour across all licences, complete pagination where the SDK drops cursors, or future methods added after the pinned 0.5.4 package. Those claims require upstream SDK fixes, a direct protocol implementation reviewed method by method, or a new catalogue when the pinned SDK changes.

The original `read_portfolio` scope remains much smaller and easier to defend: `accounts`, `positions`, `assets` and `prime_assets`. If the product widens to one `tiger_read` tool for all account reads, its input should be a closed query enum mapped internally to the 24 distinct signed methods above. It must never accept the wire method string or raw Tiger payload.

## Write separation

The official TypeScript `TradeClient` places, modifies and cancels orders using `place_order`, `modify_order` and `cancel_order`. The same class also contains portfolio reads. [Trade client writes](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L186-L204) [Trade client reads](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L275-L297)

Registering only one MCP tool is an important product boundary. It stops an MCP client from selecting a write tool because none is advertised. It is not, by itself, a credential boundary. Code execution in the same credential-holding process could still construct `TradeClient`, call `HttpClient.execute('place_order', ...)`, or read the private key.

For the original portfolio-only destination, a deterministic read-only boundary should:

1. Accept only a fixed `read portfolio` request. Do not accept a Tiger method name, raw JSON, account ID, URL, code, command, or arbitrary filter expression from MCP input.
2. Select the configured account internally.
3. Allow only the exact signed operations `accounts`, `positions`, `assets` and `prime_assets`.
4. Reject every other operation before signing. An allowlist is safer here than trying to maintain a denylist of Tiger write methods.
5. Return a normalised portfolio value. Do not return SDK clients, signing helpers or raw credential-bearing configuration.

If "cannot write" must remain true after compromise of the public MCP process, the private key must live in a separate, minimal signer service or process. The MCP process should have no key and should call a narrow portfolio-only interface. The signer must validate the fixed operation and payload before signing. Keeping both parts in one Node process protects against prompt and tool-argument injection, but not arbitrary code execution in that process.

IP allowlisting should be added when the deployment has stable outbound addresses. This narrows where the key can be used, but it still does not turn the key into a read-only credential.

## Official CLI and MCP

Tiger's Python package installs an official `tigeropen` CLI. It includes `trade position list` and `account assets`, but it also includes order placement, modification and cancellation commands. Its source does not expose a general CLI read-only switch. It is useful for manual API checks, not as the security boundary for this tool. [Python package CLI entry](https://github.com/tigerfintech/openapi-python-sdk/blob/master/pyproject.toml) [Python trade CLI](https://github.com/tigerfintech/openapi-python-sdk/blob/master/tigeropen/cli/trade_cmd.py) [Python account CLI](https://github.com/tigerfintech/openapi-python-sdk/blob/master/tigeropen/cli/account_cmd.py)

Tiger also ships a sample Python MCP server with `TIGERMCP_READONLY`. It registers many tools and checks the flag inside the order placement and cancellation handlers. That shape does not meet the requirement for one portfolio tool, and its handler checks are weaker than isolating the signing boundary. [Tiger sample MCP server](https://github.com/tigerfintech/openapi-python-sdk/blob/master/tigeropen/examples/ai/mcp_server/tigermcp/server.py#L31-L35) [Read-only handler checks](https://github.com/tigerfintech/openapi-python-sdk/blob/master/tigeropen/examples/ai/mcp_server/tigermcp/server.py#L654-L753)

The official TypeScript package is a library, not a CLI. Its package metadata has no `bin` entry. [TypeScript package metadata](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/package.json)

## SDK and runtime choice

Tiger's established documentation lists Java, Python, C++ and C# SDKs. Tiger now also maintains an official TypeScript SDK. [Tiger platform introduction](https://quant.itigerup.com/openapi/en/cpp/overview/introduction.html) [Tiger TypeScript SDK](https://github.com/tigerfintech/openapi-typescript-sdk)

TypeScript is the smallest fit for this repository because it avoids a second runtime and exports typed portfolio models. Pin the exact package version. The SDK is still pre-1.0, and its repository has an open report that a patch release contained a breaking rename. [TypeScript package](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/package.json) [Open semantic-versioning issue](https://github.com/tigerfintech/openapi-typescript-sdk/issues/13)

One runtime detail deserves a prototype check. The package declares Node 16 or newer, while its HTTP client uses the built-in `fetch`, which the source comment identifies as Node 18 or newer. This repository's Node 20 requirement satisfies both. [Package engine](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/package.json#L46-L48) [HTTP client source](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/client/http-client.ts#L1-L5)

The TypeScript SDK's dynamic domain lookup uses a synchronous child process and silently falls back when it fails. The implementation uses `require` inside an ESM package, so the prototype should confirm the resolved gateway in this repository's ESM and deployment runtime. Do not make the server URL user-controlled. [Dynamic domain source](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/config/domain.ts#L18-L47) [Synchronous lookup](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/config/domain.ts#L101-L127)

## Rate limits and test environments

Tiger assigns `accounts`, `assets`, `prime_assets` and `positions` to its middle-frequency group at 60 calls per minute. Tiger uses a sliding 60-second window, rejects excess requests, and warns that sustained excessive traffic can blacklist the account. The portfolio tool should coalesce concurrent reads, cache only briefly in memory if needed, and apply a lower local cap. [Tiger rate limits](https://quant.itigerup.com/openapi/en/python/permission/requestLimit.html)

Tiger creates a paper account during developer registration. Both paper and live trading use the production environment. Sandbox uses a different Tiger ID and RSA key, and Tiger recommends paper trading over sandbox. Paper trading is the right place to verify account discovery, endpoint choice and response normalisation without touching the live portfolio. [Tiger environment FAQ](https://quant.itigerup.com/openapi/en/python/FAQ/other.html#q2-what-are-the-difference-between-sandbox-paper-live-account-environments)

Paper trading does not prove the credential is read-only. Tiger's FAQ explicitly says a paper account can place orders when its account number is supplied. It only removes live-money impact from the prototype. [Tiger paper-account FAQ](https://quant.itigerup.com/openapi/en/python/FAQ/other.html#q1-how-to-use-your-paper-trading-account)

## Prototype questions to settle before implementation

1. Which account type and licence does the user's configured account report?
2. Does `getManagedAccounts()` return the intended live and paper accounts without extra institutional credentials?
3. Does the TypeScript package's no-argument `getPrimeAssets()` return the required cash and net-liquidation fields for that paper account?
4. Does `getPositions({ secType: 'ALL' })` return stocks, options and futures, or must the implementation call each supported type separately?
5. Does the SDK resolve the correct Tiger gateway in this ESM runtime, or should a reviewed fixed gateway be supplied through trusted configuration?
6. Does the chosen deployment have a stable outbound IP that can be added to Tiger's IP allowlist?
7. What guarantee is required: protection from MCP prompt and argument injection, or protection even if the MCP process is compromised? The latter requires a separate credential-holding boundary.

Do these checks with a paper account and synthetic holdings. Do not log the private key, token, complete raw configuration, or full personal portfolio. Live-account verification should be a later, explicit approval step.

## Proposed acceptance facts for the final plan

- MCP advertises exactly one tool, `read_portfolio`.
- Its input cannot choose a Tiger operation, account, URL, command, code string or raw payload.
- The key holder rejects every Tiger method except `accounts`, `positions`, `assets` and `prime_assets` before signing.
- Account type selects `assets` or `prime_assets` deterministically.
- The returned value has one stable, documented schema across Global, Prime and paper accounts.
- Tests prove that malicious input cannot reach a write operation and that unknown operation names fail closed before the network call.
- Paper-account integration evidence covers account discovery, assets, all supported position types, empty portfolios, Tiger errors and rate limiting.
- No credentials, raw SDK configuration or personal portfolio values enter logs, persisted caches or test fixtures.
- The plan states whether the guarantee stops at the trusted Node process or uses a separate signer boundary.
