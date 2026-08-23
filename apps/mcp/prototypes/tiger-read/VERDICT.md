# Prototype verdict

Validated on 23 August 2026 against the configured Tiger paper account with
`@tigeropenapi/tigeropen@0.5.4`. No production MCP, live account, or write
operation was touched.

## Question

Can one generic `tiger_read` tool preserve the official SDK's flexibility while
deterministic server code prevents every write before the SDK or network is
reached?

## Verdict

Yes, with a pinned and reviewed method list. The prototype classified every
callable `TradeClient` method in SDK 0.5.4 and exposed 28 reviewed reads. It
rejected nine writes, three credential-lifecycle methods, unknown methods, and
caller-controlled account or credential fields before accessing the SDK.

The live runner verified that the configured account reports `PAPER`. Eleven
distinct read methods returned successfully, covering account discovery,
orders, stock/option/future positions, assets, prime assets, asset analytics,
segment-fund availability, and segment-fund history. The runner emitted only
response shapes and counts.

## Limits discovered

- Seven specialised reads returned Tiger parameter, permission, or capability
  codes on this empty paper account: aggregate assets, fund details, funding
  history, two position-transfer queries, and two option-exercise queries.
- Ten reads need a real symbol, contract, order, transfer, or preview input and
  were not invoked with invented data.
- These results verify the gate and a representative live read surface. They do
  not prove that every allowed method succeeds for every Tiger account type.
- npm publishes `0.5.4`; GitHub's later `0.5.5` is not currently installable
  from npm and changes SDK-version reporting rather than the reviewed methods.
- Tiger's IP allowlist requires stable outbound IP in production. Local
  development can whitelist the current IP for an integration-test session.
- `op run` required an interactive terminal for 1Password authorisation.

## Decision carried forward

Use one `tiger_read` MCP tool, one pinned read-method allowlist, and direct SDK
argument pass-through after rejecting server-controlled fields. Block new or
unclassified SDK methods by default. Keep credentials, account selection, and
licence in server configuration.
