import assert from "node:assert/strict";

import type { TradeClient } from "@tigeropenapi/tigeropen";

import {
  getUnclassifiedTradeClientMethods,
  TIGER_CREDENTIAL_METHODS,
  TIGER_READ_METHODS,
  TIGER_WRITE_METHODS,
  TigerReadGate,
} from "./read-gate";

const accessedMethods: string[] = [];
const fakeClient = new Proxy(
  {},
  {
    get(_target, property) {
      accessedMethods.push(String(property));
      return async () => ({ reachedFakeSdk: true });
    },
  },
) as TradeClient;
const gate = new TigerReadGate(fakeClient);

assert.deepEqual(getUnclassifiedTradeClientMethods(), []);

for (const method of [...TIGER_WRITE_METHODS, ...TIGER_CREDENTIAL_METHODS]) {
  await assert.rejects(
    gate.read({ method }),
    new RegExp(`not allowed: ${method}`),
  );
}
assert.deepEqual(accessedMethods, []);

await assert.rejects(
  gate.read({ method: "getPositions", args: [{ account: "another-account" }] }),
  /args\[0\]\.account is controlled by the MCP server/,
);
assert.deepEqual(accessedMethods, []);

const allowedResult = await gate.read({ method: "getPositions", args: [{}] });
assert.deepEqual(allowedResult, { reachedFakeSdk: true });
assert.deepEqual(accessedMethods, ["getPositions"]);

console.log(
  JSON.stringify(
    {
      allowedReadMethods: TIGER_READ_METHODS.length,
      blockedCredentialMethods: TIGER_CREDENTIAL_METHODS.length,
      blockedWriteMethods: TIGER_WRITE_METHODS.length,
      serverControlledArgumentsBlockedBeforeSdk: true,
      unclassifiedSdkMethods: 0,
    },
    null,
    2,
  ),
);
