import type { DefineAPI, DefineEvents, SDK } from "caido:plugin";

import { initializeRSAKeys } from "./services/crypto";
import {
  clearAllData,
  clearInteractions,
  clearUrls,
  deleteInteraction,
  deleteInteractions,
  generateInteractshUrl,
  getActiveUrls,
  getClientCount,
  getFilter,
  getInteractions,
  getInteractshStatus,
  getNewInteractions,
  initializeClients,
  pollInteractsh,
  removeUrl,
  setFilter,
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
  deleteInteraction: typeof deleteInteraction;
  deleteInteractions: typeof deleteInteractions;
  getInteractshStatus: typeof getInteractshStatus;
  getActiveUrls: typeof getActiveUrls;
  setUrlActive: typeof setUrlActive;
  removeUrl: typeof removeUrl;
  clearUrls: typeof clearUrls;
  initializeClients: typeof initializeClients;
  getClientCount: typeof getClientCount;
  clearAllData: typeof clearAllData;
  setFilter: typeof setFilter;
  getFilter: typeof getFilter;
}>;

// Events that can be sent from backend to frontend
export type BackendEvents = DefineEvents<{
  onDataChanged: () => void;
  onUrlGenerated: (url: string) => void;
  onFilterChanged: (filter: string) => void;
}>;

let sdkInstance: SDK<API, BackendEvents> | null = null;

export function getSDK(): SDK<API, BackendEvents> | null {
  return sdkInstance;
}

export function emitDataChanged(): void {
  if (sdkInstance) {
    sdkInstance.api.send("onDataChanged");
  }
}

export function emitUrlGenerated(url: string): void {
  if (sdkInstance) {
    sdkInstance.api.send("onUrlGenerated", url);
  }
}

export function emitFilterChanged(filter: string): void {
  if (sdkInstance) {
    sdkInstance.api.send("onFilterChanged", filter);
  }
}

export function init(sdk: SDK<API, BackendEvents>) {
  sdkInstance = sdk;
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
  sdk.api.register("deleteInteraction", deleteInteraction);
  sdk.api.register("deleteInteractions", deleteInteractions);
  sdk.api.register("getInteractshStatus", getInteractshStatus);

  // URL Management API
  sdk.api.register("getActiveUrls", getActiveUrls);
  sdk.api.register("setUrlActive", setUrlActive);
  sdk.api.register("removeUrl", removeUrl);
  sdk.api.register("clearUrls", clearUrls);

  // Client Management API
  sdk.api.register("initializeClients", initializeClients);
  sdk.api.register("getClientCount", getClientCount);

  // Data Management API
  sdk.api.register("clearAllData", clearAllData);

  // Filter API
  sdk.api.register("setFilter", setFilter);
  sdk.api.register("getFilter", getFilter);
}
