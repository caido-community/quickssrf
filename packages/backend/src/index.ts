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
  getFilterEnabled,
  getInteractions,
  getInteractshStatus,
  getNewInteractions,
  getSelectedRowId,
  initializeClients,
  pollInteractsh,
  removeUrl,
  setFilter,
  setFilterEnabled,
  setInteractionTag,
  setSelectedRowId,
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
  setFilterEnabled: typeof setFilterEnabled;
  getFilterEnabled: typeof getFilterEnabled;
  setInteractionTag: typeof setInteractionTag;
  setSelectedRowId: typeof setSelectedRowId;
  getSelectedRowId: typeof getSelectedRowId;
}>;

// Events that can be sent from backend to frontend
export type BackendEvents = DefineEvents<{
  onDataChanged: () => void;
  onUrlGenerated: (url: string) => void;
  onFilterChanged: (filter: string) => void;
  onFilterEnabledChanged: (enabled: boolean) => void;
  onUrlsChanged: () => void;
  onRowSelected: (uniqueId: string | undefined) => void;
}>;

let sdkInstance: SDK<API, BackendEvents> | undefined;

export function getSDK(): SDK<API, BackendEvents> | undefined {
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

export function emitFilterEnabledChanged(enabled: boolean): void {
  if (sdkInstance) {
    sdkInstance.api.send("onFilterEnabledChanged", enabled);
  }
}

export function emitUrlsChanged(): void {
  if (sdkInstance) {
    sdkInstance.api.send("onUrlsChanged");
  }
}

export function emitRowSelected(uniqueId: string | undefined): void {
  if (sdkInstance) {
    sdkInstance.api.send("onRowSelected", uniqueId);
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
  sdk.api.register("setFilterEnabled", setFilterEnabled);
  sdk.api.register("getFilterEnabled", getFilterEnabled);

  // Tag API
  sdk.api.register("setInteractionTag", setInteractionTag);

  // Selection API
  sdk.api.register("setSelectedRowId", setSelectedRowId);
  sdk.api.register("getSelectedRowId", getSelectedRowId);
}
