import type { SDK } from "caido:plugin";
import type { Result } from "shared";
import { err } from "shared";

import { getErrorMessage } from "../errors";
import { isPolling, startPolling, stopPolling } from "../services";

export function apiStartPolling(_sdk: SDK): Result<void> {
  try {
    startPolling();
    return { kind: "Ok", value: undefined };
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export function apiStopPolling(_sdk: SDK): Result<void> {
  try {
    stopPolling();
    return { kind: "Ok", value: undefined };
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export function apiGetPollingStatus(_sdk: SDK): Result<boolean> {
  try {
    return { kind: "Ok", value: isPolling() };
  } catch (e) {
    return err(getErrorMessage(e));
  }
}
