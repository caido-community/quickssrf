import type { SDK } from "caido:plugin";
import type {
  ActiveUrl,
  GenerateUrlResult,
  Interaction,
  InteractshStartOptions,
} from "shared";

import { InteractshStore } from "../stores/interactsh";

export const startInteractsh = async (
  sdk: SDK,
  options: InteractshStartOptions,
): Promise<boolean> => {
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
): Promise<GenerateUrlResult> => {
  const store = InteractshStore.get(sdk);
  return store.generateUrl(serverUrl);
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

export const pollInteractsh = async (sdk: SDK): Promise<void> => {
  const store = InteractshStore.get(sdk);
  return store.poll();
};

export const clearInteractions = (sdk: SDK): void => {
  const store = InteractshStore.get(sdk);
  store.clearInteractions();
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
