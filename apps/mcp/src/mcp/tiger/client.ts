import { resolve } from "node:path";

import {
  createClientConfig,
  TradeClient,
} from "@tigeropenapi/tigeropen";

import {
  performTigerRead,
  type TigerReadRequest,
} from "./read-gate";

type TigerEnvironment = Readonly<Record<string, string | undefined>>;

type TigerCredentials = {
  tigerId: string;
  privateKey: string;
  account: string;
  license: string;
};

function requireEnvironmentValue(
  environment: TigerEnvironment,
  name: string,
) {
  const value = environment[name];
  if (value) {
    return value;
  }
  throw new Error(`Tiger configuration is incomplete: missing ${name}`);
}

function readTigerCredentials(environment: TigerEnvironment): TigerCredentials {
  if (
    Object.entries(environment).some(
      ([name, value]) => name.startsWith("TIGEROPEN_") && Boolean(value),
    )
  ) {
    throw new Error("Refusing ambient Tiger SDK configuration");
  }

  return {
    tigerId: requireEnvironmentValue(environment, "TIGER_ID"),
    privateKey: requireEnvironmentValue(
      environment,
      "TIGER_PRIVATE_KEY_PKCS8",
    ),
    account: requireEnvironmentValue(environment, "TIGER_ACCOUNT"),
    license: requireEnvironmentValue(environment, "TIGER_LICENSE"),
  };
}

/** Creates the credential-holding client after checking for SDK overrides. */
export function createTigerReader(
  environment: TigerEnvironment = process.env,
) {
  const credentials = readTigerCredentials(environment);
  // Disable the SDK's ambient properties, token-file, and dynamic-domain inputs.
  const config = createClientConfig({
    ...credentials,
    propertiesFilePath: resolve(
      process.cwd(),
      ".sh-no-tiger-properties.properties",
    ),
    tokenLoader: () => "",
    enableDynamicDomain: false,
  });
  const configPreservedCredentials =
    config.tigerId === credentials.tigerId &&
    config.privateKey === credentials.privateKey &&
    config.account === credentials.account &&
    config.license === credentials.license;

  if (!configPreservedCredentials) {
    throw new Error("Tiger SDK configuration did not preserve credentials");
  }

  const tradeClient = TradeClient.fromConfig(config, credentials.account);
  return (request: TigerReadRequest) => performTigerRead(tradeClient, request);
}

export type TigerReader = ReturnType<typeof createTigerReader>;

let tigerReader: TigerReader | undefined;

/** Loads Tiger credentials only when the first reviewed read is invoked. */
export function getTigerReader() {
  tigerReader ??= createTigerReader();
  return tigerReader;
}
