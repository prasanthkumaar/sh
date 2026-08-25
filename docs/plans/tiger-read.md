# Tiger account-read MCP

Status: implemented in [PR #25](https://github.com/prasanthkumaar/sh/pull/25)

Wayfinder map: [#17](https://github.com/prasanthkumaar/sh/issues/17)

## Outcome

Add one authenticated MCP tool named `tiger_read`. It calls the non-mutating
methods reviewed in `@tigeropenapi/tigeropen@0.5.4` while server code keeps
writes, raw dispatch, credential operations and alternate-account access
unreachable.

This protects against MCP callers and tool arguments. It does not protect the
credential if arbitrary code runs inside the credential-holding server process.

## Contract

```ts
type TigerReadInput = {
  method: TigerReadMethod;
  args?: readonly unknown[];
};

type TigerReadOutput = {
  result: unknown;
};
```

`method` is a strict enum containing the reviewed methods in
`apps/mcp/src/mcp/tiger/read-gate.ts`. `args` contains the exact positional
arguments accepted by the matching `TradeClient` method in SDK version 0.5.4.
The tool returns the SDK result unchanged, except `undefined` becomes JSON
`null`.

```json
{"method":"getPositions","args":[{"secType":"STK"}]}
```

```json
{"method":"getFilledOrders","args":[{"startDate":1784908800000,"endDate":1787500800000,"limit":100}]}
```

Callers should use the pinned SDK's `TradeClient` types and documentation for
method-specific arguments. The MCP does not maintain a copied SDK declaration.

## Read-only boundary

```text
authenticated tiger_read
  -> strict read allowlist
  -> reject server-controlled fields
  -> configured TradeClient method
  -> Tiger SDK signing and transport
```

Before SDK property access, the server rejects:

- Every method absent from the positive read allowlist, including writes,
  credential operations, internal helpers and future SDK methods.
- Any argument object containing account, credential or Tiger endpoint fields,
  including nested objects and arrays.

The tool never exposes `TradeClient`, `HttpClient`, configuration or credentials.
MCP annotations describe the tool but do not enforce the boundary.

## Configuration

The committed `.env.schema` loads these server-owned values from 1Password:

```dotenv
TIGER_ID=op://sh/Development/TIGER_ID
TIGER_PRIVATE_KEY_PKCS8=op://sh/Development/TIGER_PRIVATE_KEY_PKCS8
TIGER_ACCOUNT=op://sh/Development/TIGER_ACCOUNT
TIGER_LICENSE=op://sh/Development/TIGER_LICENSE
```

The server reads them on the first valid Tiger call and reuses the resulting
reader. It rejects ambient `TIGEROPEN_*` values and disables SDK token-file and
dynamic-domain discovery.

## Verification

Automated tests cover:

- Write and unknown methods failing before `TradeClient` access.
- Nested account and credential fields failing before `TradeClient` access.
- Allowed methods preserving SDK arguments, receiver binding and results.
- Authenticated MCP discovery, invocation, input rejection and bounded errors.
- Missing or ambient configuration failing without exposing values.

The supervised paper-account acceptance run completed on 25 August 2026. Tiger
identified the configured account as `PAPER` before managed accounts, prime
assets, stock, option and futures positions, and filled orders were read. The
run printed no credentials, account identifiers, arguments, portfolio values or
raw Tiger responses. This evidence lives in ticket #24 rather than permanent
application code.

## Limits

"All reads" means all reviewed non-mutating methods exposed by the pinned
TypeScript `TradeClient`. It does not include Tiger server endpoints absent from
that SDK, including executions and user transactions.

Production credentials still require Tiger's IP allowlist and a host with stable
outbound IP. Production, Vercel and live-account changes remain separate work.
