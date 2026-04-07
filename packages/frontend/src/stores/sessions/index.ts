import { defineStore } from "pinia";

import { useSelectionState } from "./useSelectionState";
import { useSessionsState } from "./useSessionsState";

export const useSessionsStore = defineStore("stores.sessions", () => {
  return {
    ...useSessionsState(),
    ...useSelectionState(),
  };
});
