import {
  createClientConfig,
  TradeClient,
} from "@tigeropenapi/tigeropen";

const environmentNames = [
  "TIGER_ID",
  "TIGER_PRIVATE_KEY_PKCS8",
  "TIGER_ACCOUNT",
  "TIGER_LICENSE",
] as const;

type EnvironmentName = (typeof environmentNames)[number];

function requireEnvironmentValue(name: EnvironmentName): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

/** Creates the SDK client without relying on Tiger's less semantic env names. */
export function createPrototypeTigerClient() {
  const tigerId = requireEnvironmentValue("TIGER_ID");
  const privateKey = requireEnvironmentValue("TIGER_PRIVATE_KEY_PKCS8");
  const account = requireEnvironmentValue("TIGER_ACCOUNT");
  const license = requireEnvironmentValue("TIGER_LICENSE");
  const config = createClientConfig({
    tigerId,
    privateKey,
    account,
    license,
  });

  const configurationWasOverridden =
    config.tigerId !== tigerId ||
    config.privateKey !== privateKey ||
    config.account !== account ||
    config.license !== license;

  if (configurationWasOverridden) {
    throw new Error(
      "Tiger configuration was overridden by an ambient SDK environment variable",
    );
  }

  return {
    account,
    client: TradeClient.fromConfig(config, account),
  };
}
