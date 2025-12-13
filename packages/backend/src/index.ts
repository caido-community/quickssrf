import type { DefineAPI, SDK } from "caido:plugin";

import { initializeRSAKeys } from "./services/crypto";
import {
  clearInteractions,
  clearUrls,
  generateInteractshUrl,
  getActiveUrls,
  getClientCount,
  getInteractions,
  getInteractshStatus,
  getNewInteractions,
  initializeClients,
  pollInteractsh,
  removeUrl,
  setUrlActive,
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
  getActiveUrls: typeof getActiveUrls;
  setUrlActive: typeof setUrlActive;
  removeUrl: typeof removeUrl;
  clearUrls: typeof clearUrls;
  initializeClients: typeof initializeClients;
  getClientCount: typeof getClientCount;
}>;

export function init(sdk: SDK<API>) {
  sdk.console.log("Initializing QuickSSRF backend");

  // Pre-initialize RSA keys for faster first request
  sdk.console.log("Pre-initializing RSA keys...");
  initializeRSAKeys();
  sdk.console.log("RSA keys ready");

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

  // URL Management API
  sdk.api.register("getActiveUrls", getActiveUrls);
  sdk.api.register("setUrlActive", setUrlActive);
  sdk.api.register("removeUrl", removeUrl);
  sdk.api.register("clearUrls", clearUrls);

  // Client Management API
  sdk.api.register("initializeClients", initializeClients);
  sdk.api.register("getClientCount", getClientCount);
}
