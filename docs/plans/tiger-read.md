# Tiger account-read MCP plan

Status: ready for implementation

Wayfinder map: [Wayfind a read-only Tiger account MCP](https://github.com/prasanthkumaar/sh/issues/17)

## Outcome

Add one authenticated MCP tool named `tiger_read` to the existing TypeScript MCP server. It gives callers the flexibility of Tiger's official `TradeClient` read surface while deterministic server code makes write, credential-lifecycle, account-selection, and arbitrary-execution paths unreachable.

The first version trusts the credential-holding MCP backend process. It protects against MCP callers and tool arguments, not arbitrary code execution inside that backend.

## Evidence

- [Tiger SDK account-read research](https://github.com/prasanthkumaar/sh/blob/research/tiger-read-portfolio/docs/research/tiger-openapi-read-portfolio.md), commit `da4d1ed`
- [Tiger write-authentication research](https://github.com/prasanthkumaar/sh/blob/research/tiger-write-auth/docs/research/tiger-openapi-write-authentication.md), commit `60849ca`
- [Paper-account prototype and verdict](https://github.com/prasanthkumaar/sh/tree/prototype/tiger-read/apps/mcp/prototypes/tiger-read), commit `8ee1664`

The prototype verified the complete SDK method classification, blocked every classified write before SDK access, confirmed the configured account reports `PAPER`, and completed representative live reads without printing portfolio values.

## Scope

### In scope

- Private state and history for one configured Tiger account.
- Non-mutating previews and capacity calculations already implemented by the pinned SDK.
- Account-aware contract-reference reads already implemented by the pinned SDK.
- Caller-supplied SDK arguments, except server-controlled account and credential fields.
- One static MCP resource describing the allowed method signatures and examples.

### Out of scope

- Public quote and market-data APIs.
- Tiger server reads absent from the pinned TypeScript SDK, including `order_executions`, `partition_account`, and `user_transactions`.
- Caller-supplied code, commands, URLs, Tiger wire methods, raw signed requests, or server-side batch plans.
- A separate signer or credential service.
- Response normalisation, data persistence, caching, and custom rate limiting.
- Live-account testing or production deployment without separate approval.

“All reads” means every reviewed non-mutating method in the exact pinned SDK. It does not mean every current Tiger server endpoint or any method added by a future SDK version.

## External contract

### Tool

```ts
type TigerReadInput = {
  method: TigerReadMethod;
  args?: readonly unknown[];
};

type TigerReadOutput = {
  result: unknown;
};
```

Register `tiger_read` with:

- `method`: a strict enum containing only the reviewed SDK method names below.
- `args`: the positional arguments for that exact SDK method, represented as MCP JSON.
- `result`: the SDK result unchanged, except SDK `undefined` becomes JSON `null` inside the stable output envelope.
- `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, and `openWorldHint: true`.

One MCP call invokes one SDK method. Callers compose multiple reads in their own code.

Examples:

```json
{"method":"getPositions","args":[{"secType":"STK"}]}
```

```json
{"method":"getFilledOrders","args":[{"startDate":1784908800000,"endDate":1787500800000,"limit":100}]}
```

### Resource

Register one static resource:

```text
URI: tiger://read-client.d.ts
MIME type: text/typescript
```

Its content is a pruned TypeScript declaration of the pinned SDK's allowed methods and request types, plus two invocation examples. Preserve the SDK's method names, positional arguments, camelCase request fields, return types, and documentation comments. Remove server-controlled fields from the displayed request types so callers are not taught to send them.

Keep this declaration as a checked-in file. A verification test compares its method names with the runtime allowlist and the pinned SDK surface. An SDK upgrade must update all three in one change.

## Reviewed method catalogue

Pin `@tigeropenapi/tigeropen@0.5.4`. npm did not publish GitHub source release 0.5.5 during the prototype; 0.5.5 changes version reporting rather than this method surface.

### Allowed reads

Account state and history:

```text
getOrders
getActiveOrders
getInactiveOrders
getFilledOrders
getOrder
getOrderTransactions
getPositions
getAssets
getPrimeAssets
getManagedAccounts
getAnalyticsAsset
getAggregateAssets
getSegmentFundAvailable
getSegmentFundHistory
getFundDetails
getFundingHistory
getPositionTransferRecords
getPositionTransferDetail
getPositionTransferExternalRecords
getOptionExercisePositions
getOptionExerciseRecords
```

Non-mutating calculations and previews:

```text
previewOrder
getEstimateTradableQuantity
checkOptionExercise
```

Account-aware contract references:

```text
getContract
getContracts
getQuoteContract
getDerivativeContracts
```

`getFundingHistory` is allowed even though its fixed Tiger wire method is `transfer_fund`; Tiger documents this SDK wrapper as a history query. The MCP caller never supplies that wire name.

### Explicitly blocked writes

```text
placeOrder
modifyOrder
cancelOrder
placeForexOrder
transferSegmentFund
cancelSegmentFund
transferPosition
submitOptionExercise
cancelOptionExercise
```

### Explicitly blocked credential lifecycle

```text
queryToken
refreshToken
startTokenAutoRefresh
```

Also classify the SDK's internal `callInto` and `callIntoItems` helpers as unavailable. A verification test fails when `TradeClient.prototype` contains any unclassified callable method.

## Security invariant

The only credential-holding path is:

```text
authenticated MCP call
  → strict tiger_read input
  → reviewed method allowlist
  → server-controlled-field rejection
  → exact TradeClient method lookup
  → official SDK signing and transport
```

Enforce these rules before method lookup or network access:

1. The requested method is in the static allowlist.
2. `args` is an array of MCP JSON values.
3. No argument object at any depth contains `account`, `accountId`, `fromAccount`, `toAccount`, `subAccounts`, `tigerId`, `privateKey`, `secretKey`, `token`, `license`, `serverUrl`, or `quoteServerUrl`.
4. The looked-up property is a function on the configured `TradeClient` instance.

The SDK may accept some of those fields in read request types and may prefer caller values over the client's configured account. Rejecting them is therefore part of the security boundary, not optional input validation.

The tool module must not export the underlying `TradeClient`, `HttpClient`, configuration object, or credentials. It must not call the SDK's raw `HttpClient.execute` path. MCP annotations document intent but do not enforce it.

## Configuration

Extend the committed root `.env.schema`. Do not create `.env.example` or `.env.local`.

```dotenv
TIGER_ID=op://sh/Development/TIGER_ID
TIGER_PRIVATE_KEY_PKCS8=op://sh/Development/TIGER_PRIVATE_KEY_PKCS8
TIGER_ACCOUNT=op://sh/Development/TIGER_ACCOUNT
TIGER_LICENSE=op://sh/Development/TIGER_LICENSE
```

Pass these values explicitly to `createClientConfig`:

```ts
createClientConfig({
  tigerId: environment.TIGER_ID,
  privateKey: environment.TIGER_PRIVATE_KEY_PKCS8,
  account: environment.TIGER_ACCOUNT,
  license: environment.TIGER_LICENSE,
});
```

Tiger's standard `TIGEROPEN_*` environment variables override explicit options. After creating the config, compare its Tiger ID, private key, account, and licence with the four selected values and fail closed on any mismatch. Never log either side of the comparison.

Read the environment lazily on the first `tiger_read` call so server startup, tool discovery, type-checking, and credential-free tests do not require Tiger credentials. Reuse the constructed client, but do not cache account data or method results.

## File changes

```text
/.env.schema
/apps/mcp/package.json
/pnpm-lock.yaml
/apps/mcp/src/mcp/server.ts
/apps/mcp/src/mcp/tiger/client.ts
/apps/mcp/src/mcp/tiger/read-gate.ts
/apps/mcp/src/mcp/tiger/read-client.d.ts
/apps/mcp/src/mcp/tiger/read-resource.ts
/apps/mcp/src/mcp/tools/tiger-read.ts
/apps/mcp/scripts/tiger-read-paper-smoke.ts
/apps/mcp/test/tiger-read.test.ts
/apps/mcp/test/mcp.integration.test.ts
```

Do not merge the prototype directory into the implementation branch. Reimplement the validated boundary in the production module shape above.

## Implementation sequence

### 1. Add the pinned dependency and configuration schema

- Add exact dependency `@tigeropenapi/tigeropen@0.5.4`.
- Add the four 1Password references to `.env.schema`.
- Add root and MCP-package scripts named `tiger:paper-smoke`.
- Implement a small environment reader returning four required strings.
- Build the `ClientConfig`, reject ambient override mismatches, and create one `TradeClient` for the configured account.

Complete when dependency installation is deterministic, missing values fail without being logged, and importing the MCP server requires no Tiger environment.

### 2. Implement the read gate

- Define the 28-name `TIGER_READ_METHODS` tuple in `read-gate.ts`.
- Keep the write, credential, and internal classifications beside it for exhaustive verification.
- Accept `{ method, args }`, reject non-allowlisted methods and server-controlled fields, then invoke the exact SDK method with `Reflect.apply`.
- Return the SDK value without transformation.

Complete when fake-client verification proves every rejected request fails before client property access and every allowed request preserves arguments, receiver binding, result, and Tiger errors.

### 3. Register the tool and resource

- Register `tiger_read` in `tools/tiger-read.ts` using a strict Zod schema.
- Acquire the lazily constructed gate only inside the tool handler.
- Wrap the result as `{ result }`; convert only `undefined` to `null` for JSON.
- Serve the checked-in `read-client.d.ts` at `tiger://read-client.d.ts`.
- Register both from `configureMcpServer` beside the existing `echo` tool.

Complete when an authenticated MCP client discovers exactly `echo` and `tiger_read`, lists the Tiger resource, and reads its declarations without loading credentials.

### 4. Add focused verification

Add tests for:

1. The 28 allowed, nine write, three credential, and two internal methods exhaust the pinned `TradeClient.prototype` surface.
2. Every blocked and unknown method fails before SDK property access.
3. Every server-controlled key is rejected at the top level and when nested.
4. Representative zero-, one-, and two-argument allowed methods preserve argument order and `this` binding.
5. SDK results and safe Tiger error codes pass through without logging arguments or results.
6. Missing configuration and ambient `TIGEROPEN_*` overrides fail closed.
7. The static resource and runtime allowlist contain the same method names.
8. Existing Clerk authentication still blocks unauthenticated execution.

Complete when `pnpm type-check`, `pnpm test`, and `pnpm build` pass with no Tiger credentials present.

### 5. Run the paper-account acceptance check

Use an interactive terminal because 1Password requires authorisation:

```sh
op run --env-file=.env.schema -- pnpm tiger:paper-smoke
```

The smoke runner must first call `getManagedAccounts` and stop unless the configured account reports `PAPER`. Then call `getPrimeAssets`, `getPositions` for `STK`, `OPT`, and `FUT`, and `getFilledOrders` with an explicit date range. Print only method name, success/failure, response shape, and item count.

Complete when the paper guard passes, all attempted calls are read methods, no secret or portfolio value appears in output, and any Tiger capability error is recorded as an observed limitation rather than disguised as success.

### 6. Gate deployment separately

Tiger's key has write authority, so retain its IP allowlist. The production host must have a stable outbound IP before any Tiger credential is configured there. Whitelist that exact IP and verify it from the deployed runtime.

Production environment changes, live-account checks, Vercel changes, and deployment require separate explicit approval. Until then, implementation completion means local tests and the paper-account acceptance check pass.

## Logging and failure behaviour

- Log method name, generated request ID, elapsed time, and success/failure only.
- Never log arguments, results, account IDs, credentials, configuration objects, Tiger raw responses, or stack traces returned to callers.
- Return a bounded tool error containing the Tiger error code and safe message when available.
- Let Tiger enforce its upstream rate limits. Preserve rate-limit errors for the caller to handle.
- Keep each call independent. Add no retries beyond the pinned SDK's existing behaviour.

## Known limitations

- The empty paper account could not prove specialised reads that require transfer eligibility, option positions, existing order or transfer IDs, or account-specific permissions.
- The pinned SDK does not expose every private Tiger server read. In particular, this version cannot satisfy the broadest interpretation of executions and user transactions.
- Some SDK request types differ from Tiger's endpoint documentation. Preserve the SDK contract in version one and record Tiger errors instead of adding undocumented wire parameters.
- Local development IPs may change. Update Tiger's whitelist only for a supervised paper-account test session; production requires stable egress.

## Acceptance criteria

- MCP advertises one new tool, `tiger_read`, and one static resource.
- Only the 28 listed SDK methods can reach `TradeClient`.
- Every write, credential, raw-dispatch, unknown-method, alternate-account, and credential-override attempt fails before SDK or network access.
- Callers use official SDK method names and argument shapes rather than a custom portfolio model.
- Credentials exist only in server environment configuration and never appear in MCP schemas, resources, logs, errors, or test fixtures.
- No caching, persistence, batch execution, public market data, or response normalisation is added.
- Credential-free type-check, tests, and build pass.
- Supervised paper-account acceptance evidence passes before implementation handoff.
- Production remains untouched until stable egress and deployment are separately approved.
