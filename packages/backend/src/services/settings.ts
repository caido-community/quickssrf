import type { SDK } from "caido:plugin";
import { SettingsStore } from "../stores/settings";
import type { Settings } from "shared";

export const getSettings = (sdk: SDK) => {
  const store = SettingsStore.get(sdk);
  return store.getSettings();
};

export const updateSettings = (sdk: SDK, newSettings: Partial<Settings>) => {
  const store = SettingsStore.get(sdk);
  return store.updateSettings(sdk, newSettings);
};

export const resetSettings = (sdk: SDK) => {
  const store = SettingsStore.get(sdk);
  return store.resetSettings();
};
