import type {
  TigerReadMethod,
  TigerReadRequest,
} from "./read-gate";

export type PaperSmokeObservation = {
  method: TigerReadMethod;
  status: "success" | "failure";
  responseShape: "array" | "object" | "null" | "primitive" | "error";
  itemCount: number;
};

type PaperSmokeOptions = {
  configuredAccount: string;
  performReviewedRead: (request: TigerReadRequest) => Promise<unknown>;
  writeObservation: (observation: PaperSmokeObservation) => void;
  now?: () => number;
};

type PaperSmokeRead = {
  method: TigerReadMethod;
  args: readonly unknown[];
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000;

function describeResponse(
  method: TigerReadMethod,
  result: unknown,
): PaperSmokeObservation {
  if (Array.isArray(result)) {
    return {
      method,
      status: "success",
      responseShape: "array",
      itemCount: result.length,
    };
  }
  if (result === null || result === undefined) {
    return {
      method,
      status: "success",
      responseShape: "null",
      itemCount: 0,
    };
  }
  return {
    method,
    status: "success",
    responseShape: typeof result === "object" ? "object" : "primitive",
    itemCount: 1,
  };
}

function describeFailure(method: TigerReadMethod): PaperSmokeObservation {
  return {
    method,
    status: "failure",
    responseShape: "error",
    itemCount: 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function configuredAccountIsPaper(
  managedAccounts: unknown,
  configuredAccount: string,
) {
  return (
    Array.isArray(managedAccounts) &&
    managedAccounts.some(
      (managedAccount) =>
        isRecord(managedAccount) &&
        managedAccount.account === configuredAccount &&
        typeof managedAccount.accountType === "string" &&
        managedAccount.accountType.toUpperCase() === "PAPER",
    )
  );
}

/** Runs representative reads only after Tiger positively identifies PAPER. */
export async function runTigerPaperSmoke({
  configuredAccount,
  performReviewedRead,
  writeObservation,
  now = Date.now,
}: PaperSmokeOptions) {
  const guardMethod = "getManagedAccounts";
  let managedAccounts: unknown;
  try {
    managedAccounts = await performReviewedRead({
      method: guardMethod,
      args: [],
    });
  } catch {
    writeObservation(describeFailure(guardMethod));
    return false;
  }

  const guardObservation = describeResponse(guardMethod, managedAccounts);
  const paperVerified = configuredAccountIsPaper(
    managedAccounts,
    configuredAccount,
  );
  writeObservation(
    paperVerified
      ? guardObservation
      : { ...guardObservation, status: "failure" },
  );
  if (!paperVerified) {
    return false;
  }

  const endDate = now();
  const reads: readonly PaperSmokeRead[] = [
    { method: "getPrimeAssets", args: [] },
    { method: "getPositions", args: [{ secType: "STK" }] },
    { method: "getPositions", args: [{ secType: "OPT" }] },
    { method: "getPositions", args: [{ secType: "FUT" }] },
    {
      method: "getFilledOrders",
      args: [
        {
          startDate: endDate - THIRTY_DAYS_MS,
          endDate,
          limit: 100,
        },
      ],
    },
  ];

  for (const read of reads) {
    try {
      const result = await performReviewedRead(read);
      writeObservation(describeResponse(read.method, result));
    } catch {
      writeObservation(describeFailure(read.method));
    }
  }

  return true;
}
