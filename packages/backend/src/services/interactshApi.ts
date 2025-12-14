import type { SDK } from "caido:plugin";
import type {
  ActiveUrl,
  GenerateUrlResult,
  Interaction,
  InteractshStartOptions,
} from "shared";

import { InteractshStore } from "../stores/interactsh";

export const startInteractsh = (
  sdk: SDK,
  options: InteractshStartOptions,
): boolean => {
  const store = InteractshStore.get(sdk);
  return store.start(options);
};

export const stopInteractsh = async (sdk: SDK): Promise<boolean> => {
  const store = InteractshStore.get(sdk);
  return store.stop();
};

export const generateInteractshUrl = async (
  sdk: SDK,
  serverUrl: string,
  tag?: string,
): Promise<GenerateUrlResult> => {
  const store = InteractshStore.get(sdk);
  return store.generateUrl(serverUrl, tag);
};

export const getInteractions = (sdk: SDK): Interaction[] => {
  const store = InteractshStore.get(sdk);
  return store.getInteractions();
};

export const getNewInteractions = (
  sdk: SDK,
  lastIndex: number,
): Interaction[] => {
  const store = InteractshStore.get(sdk);
  return store.getNewInteractions(lastIndex);
};

export const pollInteractsh = async (
  sdk: SDK,
  notifyOthers = false,
): Promise<void> => {
  const store = InteractshStore.get(sdk);
  return store.poll(notifyOthers);
};

export const clearInteractions = (sdk: SDK): void => {
  const store = InteractshStore.get(sdk);
  store.clearInteractions();
};

export const deleteInteraction = (sdk: SDK, uniqueId: string): boolean => {
  const store = InteractshStore.get(sdk);
  return store.deleteInteraction(uniqueId);
};

export const deleteInteractions = (sdk: SDK, uniqueIds: string[]): number => {
  const store = InteractshStore.get(sdk);
  return store.deleteInteractions(uniqueIds);
};

export const getInteractshStatus = (
  sdk: SDK,
): { isStarted: boolean; interactionCount: number } => {
  const store = InteractshStore.get(sdk);
  return store.getStatus();
};

// URL Management APIs
export const getActiveUrls = (sdk: SDK): ActiveUrl[] => {
  const store = InteractshStore.get(sdk);
  return store.getActiveUrls();
};

export const setUrlActive = (
  sdk: SDK,
  uniqueId: string,
  isActive: boolean,
): boolean => {
  const store = InteractshStore.get(sdk);
  return store.setUrlActive(uniqueId, isActive);
};

export const removeUrl = (sdk: SDK, uniqueId: string): boolean => {
  const store = InteractshStore.get(sdk);
  return store.removeUrl(uniqueId);
};

export const clearUrls = (sdk: SDK): void => {
  const store = InteractshStore.get(sdk);
  store.clearUrls();
};

export const clearAllData = (sdk: SDK): void => {
  const store = InteractshStore.get(sdk);
  store.clearAllData();
};

export const initializeClients = async (
  sdk: SDK,
  serverUrls: string[],
): Promise<number> => {
  const store = InteractshStore.get(sdk);
  return store.initializeClients(serverUrls);
};

export const getClientCount = (sdk: SDK): number => {
  const store = InteractshStore.get(sdk);
  return store.getClientCount();
};

export const setFilter = (sdk: SDK, filter: string): void => {
  const store = InteractshStore.get(sdk);
  store.setFilter(filter);
};

export const getFilter = (sdk: SDK): string => {
  const store = InteractshStore.get(sdk);
  return store.getFilter();
};

export const setFilterEnabled = (sdk: SDK, enabled: boolean): void => {
  const store = InteractshStore.get(sdk);
  store.setFilterEnabled(enabled);
};

export const getFilterEnabled = (sdk: SDK): boolean => {
  const store = InteractshStore.get(sdk);
  return store.getFilterEnabled();
};

export const setInteractionTag = (
  sdk: SDK,
  uniqueId: string,
  tag: string | undefined,
): boolean => {
  const store = InteractshStore.get(sdk);
  return store.setInteractionTag(uniqueId, tag);
};
