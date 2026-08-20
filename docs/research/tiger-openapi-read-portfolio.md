# Tiger OpenAPI research for one read-only portfolio tool

Researched on 21 August 2026. This note uses Tiger's documentation and source repositories as primary sources. No Tiger credentials or live accounts were used.

## Short answer

The tool is feasible in this Node and TypeScript repository. Tiger now publishes an official TypeScript SDK, `@tigeropenapi/tigeropen` version 0.5.5, with Node 16 or newer declared in its package metadata. This repository already requires Node 20. The Tiger package exports typed clients and response models from its root entry point. [TypeScript SDK package](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/package.json#L1-L20) [TypeScript SDK exports](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/index.ts#L21-L67)

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

## Write separation

The official TypeScript `TradeClient` places, modifies and cancels orders using `place_order`, `modify_order` and `cancel_order`. The same class also contains portfolio reads. [Trade client writes](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L186-L204) [Trade client reads](https://github.com/tigerfintech/openapi-typescript-sdk/blob/main/src/trade/trade-client.ts#L275-L297)

Registering only one MCP tool is an important product boundary. It stops an MCP client from selecting a write tool because none is advertised. It is not, by itself, a credential boundary. Code execution in the same credential-holding process could still construct `TradeClient`, call `HttpClient.execute('place_order', ...)`, or read the private key.

For a deterministic read-only boundary, the credential holder should:

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
