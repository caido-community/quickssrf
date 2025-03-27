import type { DefineAPI, SDK } from "caido:plugin";
import { getSettings, updateSettings, resetSettings } from "./services/settings";

export type API = DefineAPI<{
  getSettings: typeof getSettings;
  updateSettings: typeof updateSettings;
  resetSettings: typeof resetSettings;
}>;

export function init(sdk: SDK<API>) {
  sdk.console.log("Initializing settings store");

  sdk.api.register("getSettings", getSettings);
  sdk.api.register("updateSettings", updateSettings);
  sdk.api.register("resetSettings", resetSettings);
}
