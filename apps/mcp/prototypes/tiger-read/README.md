# Tiger read-only MCP prototype

This throwaway prototype answers one question: can one generic `tiger_read`
tool retain the official Tiger SDK's read flexibility while making write and
credential methods unreachable before the SDK or network is touched?

It is intentionally not registered in the deployed MCP server.

## What it checks

- The pinned SDK's 28 reviewed read methods are callable through one gate.
- Nine write methods and three credential-lifecycle methods are rejected.
- Account and credential arguments remain controlled by the server.
- A live integration stops unless the configured account reports `PAPER`.
- Live output reports only response shapes and counts, never portfolio values.

## Run without credentials

```sh
pnpm prototype:tiger-read:verify
```

## Run against the configured paper account

```sh
op run --env-file=.env.schema -- pnpm prototype:tiger-read:paper
```

The live run makes read requests only. Some methods may return capability or
empty-history errors when the paper account has no applicable product or data.
