import {
  createClientConfig,
  TradeClient,
} from "@tigeropenapi/tigeropen";

type TigerCredentials = {
  tigerId: string;
  privateKey: string;
  account: string;
  license: string;
};

let cachedTigerClient: TradeClient | undefined;

export function getTigerClient() {
  if (!cachedTigerClient) {
    cachedTigerClient = createTigerClient();
  }
  return cachedTigerClient;
}

function createTigerClient() {
  const credentials = loadTigerCredentials();
  const clientConfig = createClientConfig(credentials);
  return TradeClient.fromConfig(clientConfig, credentials.account);
}

function loadTigerCredentials(): TigerCredentials {
  return {
    tigerId: requireEnvironmentValue("TIGER_ID"),
    privateKey: requireEnvironmentValue("TIGER_PRIVATE_KEY_PKCS8"),
    account: requireEnvironmentValue("TIGER_ACCOUNT"),
    license: requireEnvironmentValue("TIGER_LICENSE"),
  };
}

function requireEnvironmentValue(name: string) {
  const value = process.env[name];
  if (value) {
    return value;
  }
  throw new Error(`Tiger configuration is incomplete: missing ${name}`);
}
