import { createReviewedTigerReadClient } from "../src/mcp/tiger/client";
import {
  runTigerPaperSmoke,
  type PaperSmokeObservation,
} from "../src/mcp/tiger/paper-smoke";

function writeObservation(observation: PaperSmokeObservation) {
  console.log(JSON.stringify(observation));
}

function writeSetupFailure() {
  writeObservation({
    method: "getManagedAccounts",
    status: "failure",
    responseShape: "error",
    itemCount: 0,
  });
}

async function main() {
  const configuredAccount = process.env.TIGER_ACCOUNT;
  if (!configuredAccount) {
    writeSetupFailure();
    process.exitCode = 1;
    return;
  }

  const client = createReviewedTigerReadClient(process.env, () => undefined);
  const paperVerified = await runTigerPaperSmoke({
    configuredAccount,
    performReviewedRead: (request) => client.performReviewedRead(request),
    writeObservation,
  });
  if (!paperVerified) {
    process.exitCode = 1;
  }
}

main().catch(() => {
  writeSetupFailure();
  process.exitCode = 1;
});
