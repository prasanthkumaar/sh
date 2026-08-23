# Tiger OpenAPI write authentication

Date: 23 August 2026  
Scope: official Tiger OpenAPI documentation and `tigerfintech` SDK source only. No credentials or live accounts were used.

## Conclusion

For a Singapore individual account under the TBSG licence, the concern is valid. Once OpenAPI is enabled, the same Tiger ID, account and RSA private key used for reads can also sign `place_order`, `modify_order` and `cancel_order`. Tiger's current TypeScript and Python order calls do not accept a trading password, OTP, per-order confirmation or a separate write token.

An MCP backend holding those credentials must assume it can place live orders. Account trading rules may reject a particular order, but they are not a read-only security control.

## Evidence

### TBSG retail uses the normal RSA credential path

Tiger's setup guide shows TBSG configuration with `tiger_id`, `account`, `license='TBSG'` and an RSA `private_key`. It reserves `secret_key` for institutions. The same guide says the additional token file is mandatory for Hong Kong licences, not TBSG. [Tiger Python preparation guide](https://quant.itigerup.com/openapi/en/python/quickStart/prepare.html)

Tiger requires an individual to fund an account, activate OpenAPI, complete certification and accept the API authorisation agreement. The public setup documentation does not describe a separate read-only key, a separate trading toggle after activation, or per-order approval. [OpenAPI access requirements](https://quant.itigerup.com/openapi/en/csharp/overview/openWay.html) [Registered developer setup](https://quant.itigerup.com/openapi/en/java/quickStart/prepare.html)

### TypeScript SDK

At revision [`b22802a`](https://github.com/tigerfintech/openapi-typescript-sdk/tree/b22802ad82552e5464825e90074c4be1cf8b0ab3), `TradeClient.placeOrder`, `modifyOrder` and `cancelOrder` pass their normal order data to the same internal `callInto` method. None asks for a password, OTP or confirmation. [`trade-client.ts`, lines 186-204](https://github.com/tigerfintech/openapi-typescript-sdk/blob/b22802ad82552e5464825e90074c4be1cf8b0ab3/src/trade/trade-client.ts#L186-L204)

`OrderRequest` contains account, optional institutional `secretKey` and order fields. It has no retail password, OTP or trade-token field. [`order.ts`, lines 81-187](https://github.com/tigerfintech/openapi-typescript-sdk/blob/b22802ad82552e5464825e90074c4be1cf8b0ab3/src/model/order.ts#L81-L187)

The HTTP client builds every request with the Tiger ID and method, signs it using the configured RSA private key, then sends it. A licence token, when configured, is only added as an `Authorization` header. The public raw `execute(apiMethod, requestJson)` path uses the same signing code and accepts examples including `place_order`. [`http-client.ts`, lines 73-127](https://github.com/tigerfintech/openapi-typescript-sdk/blob/b22802ad82552e5464825e90074c4be1cf8b0ab3/src/client/http-client.ts#L73-L127) [`http-client.ts`, lines 173-225](https://github.com/tigerfintech/openapi-typescript-sdk/blob/b22802ad82552e5464825e90074c4be1cf8b0ab3/src/client/http-client.ts#L173-L225)

### Python SDK

At revision [`4785441`](https://github.com/tigerfintech/openapi-python-sdk/tree/47854414da767759a7710a6c657e66306049a0ac), `place_order`, `modify_order` and `cancel_order` construct requests from order data and the optional institutional secret key. Their signatures and request construction contain no password, OTP or confirmation. [`trade_client.py`, lines 919-1097](https://github.com/tigerfintech/openapi-python-sdk/blob/47854414da767759a7710a6c657e66306049a0ac/tigeropen/trade/trade_client.py#L919-L1097)

The Python transport requires a private key and Tiger ID, signs every request with that private key and sends a licence token as an `Authorization` header only when one exists. [`tiger_open_client.py`, lines 35-64](https://github.com/tigerfintech/openapi-python-sdk/blob/47854414da767759a7710a6c657e66306049a0ac/tigeropen/tiger_open_client.py#L35-L64) [`tiger_open_client.py`, lines 84-132](https://github.com/tigerfintech/openapi-python-sdk/blob/47854414da767759a7710a6c657e66306049a0ac/tigeropen/tiger_open_client.py#L84-L132) [`tiger_open_client.py`, lines 175-194](https://github.com/tigerfintech/openapi-python-sdk/blob/47854414da767759a7710a6c657e66306049a0ac/tigeropen/tiger_open_client.py#L175-L194)

Tiger's own MCP example uses the same environment credentials for reads and writes. Its `TIGERMCP_READONLY` setting blocks `place_order` and `cancel_order` in local code before the SDK call. This is strong first-party evidence that the credential itself is not read-scoped. [MCP configuration](https://github.com/tigerfintech/openapi-python-sdk/blob/47854414da767759a7710a6c657e66306049a0ac/tigeropen/examples/ai/mcp_server/README.md#L20-L34) [MCP order guards](https://github.com/tigerfintech/openapi-python-sdk/blob/47854414da767759a7710a6c657e66306049a0ac/tigeropen/examples/ai/mcp_server/tigermcp/server.py#L654-L753)

### Java SDK and the old trade-token path

At revision [`4ee3b98`](https://github.com/tigerfintech/openapi-java-sdk/tree/4ee3b98766e05da738761f224241a8c8cc7b1d3e), the normal Java client signs requests with the RSA private key. It can optionally add `access_token` and `trade_token`, but neither is populated by the standard client configuration path. [`TigerHttpClient.java`, lines 349-388](https://github.com/tigerfintech/openapi-java-sdk/blob/4ee3b98766e05da738761f224241a8c8cc7b1d3e/src/main/java/com/tigerbrokers/stock/openapi/client/https/client/TigerHttpClient.java#L349-L388)

The Java SDK also contains an older optional `UserTradeTokenRequest` which accepts a `trade_password` and returns a trade token. Tiger's protocol appendix describes token authentication as optional. This is an alternative authentication mode, not a mandatory second factor on standard TBSG RSA-signed order calls. [`UserTradeTokenRequest.java`, lines 13-24](https://github.com/tigerfintech/openapi-java-sdk/blob/4ee3b98766e05da738761f224241a8c8cc7b1d3e/src/main/java/com/tigerbrokers/stock/openapi/client/https/request/user/UserTradeTokenRequest.java#L13-L24) [`UserTradeTokenModel.java`, lines 10-25](https://github.com/tigerfintech/openapi-java-sdk/blob/4ee3b98766e05da738761f224241a8c8cc7b1d3e/src/main/java/com/tigerbrokers/stock/openapi/client/https/domain/user/model/UserTradeTokenModel.java#L10-L25) [Tiger protocol parameters](https://quant.itigerup.com/openapi/en/cpp/appendix4/overview.html)

## Licence and account differences

| Case | Extra credential beyond Tiger ID, account and RSA private key | Effect on this decision |
| --- | --- | --- |
| TBSG individual live account | None documented | The RSA credential bundle can reach reads and writes. |
| TBHK | A licence token file is mandatory and the SDK sends its token as an `Authorization` header. | This is an extra licence-wide credential, not per-order confirmation or a read-only scope. [Tiger Java preparation guide](https://quant.itigerup.com/openapi/en/java/quickStart/prepare.html) |
| Institutional account | An institutional trader `secret_key` may be required. | Not applicable to a Singapore individual account. [Tiger place-order parameters](https://quant.itigerup.com/openapi/en/java/operation/trade/placeOrder.html) |
| Paper account | Uses a paper account number. Tiger routes it to an isolated trading environment. | It can still place paper orders without an extra password. [Tiger environment FAQ](https://quant.itigerup.com/openapi/en/python/FAQ/other.html) |
| Other retail licences | Tiger's public guide says licences other than TBHK can ignore the token. | Product and market permissions vary, but no per-order password is documented. [Tiger Java preparation guide](https://quant.itigerup.com/openapi/en/java/quickStart/prepare.html) |

## Implication for the MCP design

The smallest honest safety layer is code that never exposes or dispatches Tiger write methods. It must also withhold the SDK's generic raw executor. If agent-supplied code runs in the same process with access to the Tiger configuration or SDK, it can call `placeOrder`, `modifyOrder`, `cancelOrder` or raw `execute('place_order', ...)`. This conclusion follows directly from the TypeScript source linked above.

Keeping credentials in server-only environment variables protects them from normal MCP callers. It does not make the Tiger session read-only. Code executing inside that server process can use the credentials.

## Unknowns and limits

- No live or paper order was submitted. This research verifies supported authentication and request paths, not a particular account's current trading status.
- The logged-in TBSG developer portal was not inspected. Tiger's public documentation does not show a read-only key scope or separate post-activation trading switch, but the exact controls visible to one current account remain unverified.
- Tiger's Java SDK retains an optional transaction-password trade-token flow. The public sources do not identify a current retail licence that requires this flow for normal RSA SDK order calls.
- Brokerage, product, market and risk permissions can reject individual orders. They do not guarantee that every write will be rejected.
