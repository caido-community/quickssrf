import type { DefineAPI, SDK } from "caido:plugin";

import {
  clearInteractions,
  generateInteractshUrl,
  getInteractions,
  getInteractshStatus,
  getNewInteractions,
  pollInteractsh,
  startInteractsh,
  stopInteractsh,
} from "./services/interactshApi";
import {
  getSettings,
  resetSettings,
  updateSettings,
} from "./services/settings";

export type API = DefineAPI<{
  getSettings: typeof getSettings;
  updateSettings: typeof updateSettings;
  resetSettings: typeof resetSettings;
  startInteractsh: typeof startInteractsh;
  stopInteractsh: typeof stopInteractsh;
  generateInteractshUrl: typeof generateInteractshUrl;
  getInteractions: typeof getInteractions;
  getNewInteractions: typeof getNewInteractions;
  pollInteractsh: typeof pollInteractsh;
  clearInteractions: typeof clearInteractions;
  getInteractshStatus: typeof getInteractshStatus;
}>;

export function init(sdk: SDK<API>) {
  sdk.console.log("Initializing QuickSSRF backend");

  // Settings API
  sdk.api.register("getSettings", getSettings);
  sdk.api.register("updateSettings", updateSettings);
  sdk.api.register("resetSettings", resetSettings);

  // Interactsh API
  sdk.api.register("startInteractsh", startInteractsh);
  sdk.api.register("stopInteractsh", stopInteractsh);
  sdk.api.register("generateInteractshUrl", generateInteractshUrl);
  sdk.api.register("getInteractions", getInteractions);
  sdk.api.register("getNewInteractions", getNewInteractions);
  sdk.api.register("pollInteractsh", pollInteractsh);
  sdk.api.register("clearInteractions", clearInteractions);
  sdk.api.register("getInteractshStatus", getInteractshStatus);
}
