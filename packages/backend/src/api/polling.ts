import type { SDK } from "caido:plugin";
import type { Result } from "shared";

import { isPolling, startPolling, stopPolling } from "../services";

export function apiStartPolling(_sdk: SDK): Result<void> {
  startPolling();
  return { kind: "Ok", value: undefined };
}

export function apiStopPolling(_sdk: SDK): Result<void> {
  stopPolling();
  return { kind: "Ok", value: undefined };
}

export function apiGetPollingStatus(_sdk: SDK): Result<boolean> {
  return { kind: "Ok", value: isPolling() };
}
