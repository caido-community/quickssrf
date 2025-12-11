import type { SDK } from "caido:plugin";
import type { GenerateUrlResult, Interaction, InteractshStartOptions } from "shared";

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

export const generateInteractshUrl = (sdk: SDK): GenerateUrlResult => {
  const store = InteractshStore.get(sdk);
  return store.generateUrl();
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
