import type { SDK } from "caido:plugin";
import type { QuickSSRFConfig, Result, UpdateConfig } from "shared";
import { err } from "shared";

import { getErrorMessage } from "../errors";
import { restartPolling } from "../services";
import { configStore } from "../stores";

export function apiGetConfig(_sdk: SDK): Result<QuickSSRFConfig> {
  return { kind: "Ok", value: configStore.getConfig() };
}

export async function apiUpdateConfig(
  _sdk: SDK,
  updates: UpdateConfig,
): Promise<Result<QuickSSRFConfig>> {
  try {
    await configStore.updateConfig(updates);
    restartPolling();
    return { kind: "Ok", value: configStore.getConfig() };
  } catch (e) {
    return err(getErrorMessage(e));
  }
}
