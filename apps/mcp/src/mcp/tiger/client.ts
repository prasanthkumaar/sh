import { resolve } from "node:path";

import {
  createClientConfig,
  TradeClient,
} from "@tigeropenapi/tigeropen";

import { ReviewedTigerReadClient } from "./read-gate";

const REQUIRED_TIGER_ENVIRONMENT_NAMES = [
  "TIGER_ID",
  "TIGER_PRIVATE_KEY_PKCS8",
  "TIGER_ACCOUNT",
  "TIGER_LICENSE",
] as const;

type TigerEnvironment = Readonly<Record<string, string | undefined>>;

type SelectedTigerConfiguration = {
  tigerId: string;
  privateKey: string;
  account: string;
  license: string;
};

function readSelectedTigerConfiguration(
  environment: TigerEnvironment,
): SelectedTigerConfiguration {
  function readRequiredValue(
    name: (typeof REQUIRED_TIGER_ENVIRONMENT_NAMES)[number],
  ) {
    const value = environment[name];
    if (value) {
      return value;
    }
    throw new Error(`Tiger configuration is incomplete: missing ${name}`);
  }

  if (
    Object.entries(environment).some(
      ([name, value]) => name.startsWith("TIGEROPEN_") && Boolean(value),
    )
  ) {
    throw new Error("Refusing ambient Tiger SDK configuration");
  }

  return {
    tigerId: readRequiredValue("TIGER_ID"),
    privateKey: readRequiredValue("TIGER_PRIVATE_KEY_PKCS8"),
    account: readRequiredValue("TIGER_ACCOUNT"),
    license: readRequiredValue("TIGER_LICENSE"),
  };
}

/** Creates the credential-holding client after checking for SDK overrides. */
export function createReviewedTigerReadClient(
  environment: TigerEnvironment = process.env,
) {
  const selected = readSelectedTigerConfiguration(environment);
  const config = createClientConfig({
    ...selected,
    propertiesFilePath: resolve(
      process.cwd(),
      ".sh-no-tiger-properties.properties",
    ),
    tokenLoader: () => "",
    enableDynamicDomain: false,
  });
  const selectedValuesSurvived =
    config.tigerId === selected.tigerId &&
    config.privateKey === selected.privateKey &&
    config.account === selected.account &&
    config.license === selected.license;

  if (!selectedValuesSurvived) {
    throw new Error("Tiger SDK configuration did not preserve selected values");
  }

  const tradeClient = TradeClient.fromConfig(config, selected.account);
  return new ReviewedTigerReadClient(tradeClient);
}

let reviewedTigerReadClient: ReviewedTigerReadClient | undefined;

/** Loads Tiger credentials only when the first reviewed read is invoked. */
export function getReviewedTigerReadClient() {
  reviewedTigerReadClient ??= createReviewedTigerReadClient();
  return reviewedTigerReadClient;
}
