# sh

`sh` is a private MCP server that gives authenticated callers access to personal services through deliberately bounded capabilities.

## Language

**MCP caller**:
An authenticated client or agent invoking a capability exposed by `sh`.
_Avoid_: Backend agent, trusted agent

**Configured Tiger account**:
The single Tiger trading account selected by the server owner for private account reads.
_Avoid_: Caller account, requested account

**Reviewed Tiger read**:
A Tiger SDK operation verified as non-mutating for the exact pinned SDK version. The set includes account state, history, and calculations that submit no trade, transfer, or exercise request.
_Avoid_: Any Tiger query, read-only credential

**Paper account**:
A Tiger simulated trading account isolated from live funds but still capable of accepting paper orders.
_Avoid_: Sandbox, read-only account
