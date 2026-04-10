import { requireSDK } from "../sdk";
import { configStore } from "../stores";

import { getActiveSessionIds, pollSession } from "./sessionService";

let pollingTimer: ReturnType<typeof setInterval> | undefined;

export function startPolling(): void {
  if (pollingTimer !== undefined) return;

  const config = configStore.getConfig();
  if (!config.autoPolling) return;

  pollingTimer = setInterval(() => {
    void pollAllSessions();
  }, config.pollingInterval);

  const sdk = requireSDK();
  sdk.console.log(`Polling started (interval: ${config.pollingInterval}ms)`);
}

export function stopPolling(): void {
  if (pollingTimer === undefined) return;

  clearInterval(pollingTimer);
  pollingTimer = undefined;

  const sdk = requireSDK();
  sdk.console.log("Polling stopped");
}

export function restartPolling(): void {
  stopPolling();
  startPolling();
}

export function isPolling(): boolean {
  return pollingTimer !== undefined;
}

async function pollAllSessions(): Promise<void> {
  const sessionIds = getActiveSessionIds();
  if (sessionIds.length === 0) return;

  const sdk = requireSDK();

  for (const sessionId of sessionIds) {
    const result = await pollSession(sessionId);
    if (result.kind === "Error") {
      sdk.console.log(`Poll error for session ${sessionId}: ${result.error}`);
    }
  }
}
