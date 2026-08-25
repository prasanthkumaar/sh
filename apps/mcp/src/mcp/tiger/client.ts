import {
  createClientConfig,
  TradeClient,
} from "@tigeropenapi/tigeropen";

import {
  invokeTigerReadMethod,
  type TigerReadRequest,
} from "./read-gate";

type TigerCredentials = {
  tigerId: string;
  privateKey: string;
  account: string;
  license: string;
};

export type TigerReader = (request: TigerReadRequest) => Promise<unknown>;

let cachedTigerReader: TigerReader | undefined;

function requireEnvironmentValue(name: string) {
  const value = process.env[name];
  if (value) {
    return value;
  }
  throw new Error(`Tiger configuration is incomplete: missing ${name}`);
}

function loadTigerCredentials(): TigerCredentials {
  return {
    tigerId: requireEnvironmentValue("TIGER_ID"),
    privateKey: requireEnvironmentValue("TIGER_PRIVATE_KEY_PKCS8"),
    account: requireEnvironmentValue("TIGER_ACCOUNT"),
    license: requireEnvironmentValue("TIGER_LICENSE"),
  };
}

function createTigerReader(): TigerReader {
  const credentials = loadTigerCredentials();
  const clientConfig = createClientConfig(credentials);
  const tradeClient = TradeClient.fromConfig(
    clientConfig,
    credentials.account,
  );
  return (request: TigerReadRequest) =>
    invokeTigerReadMethod(tradeClient, request);
}

export function getTigerReader() {
  cachedTigerReader ??= createTigerReader();
  return cachedTigerReader;
}
