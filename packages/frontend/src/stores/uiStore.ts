import { useClipboard } from "@vueuse/core";
import { defineStore } from "pinia";
import { ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import type { Interaction } from "@/types";

// Skip flag for cross-tab sync
let skipNextRowSelectedEvent = false;

export const useUIStore = defineStore("ui", () => {
  const sdk = useSDK();
  const { copy } = useClipboard();

  const isGeneratingUrl = ref(false);
  const isPolling = ref(false);

  const generatedUrl = ref("");
  const btnCount = ref(0);
  const selectedRow = ref<Interaction | undefined>(undefined);

  function copyToClipboard(value: string, field: string) {
    copy(value);
    sdk.window.showToast("Copied to clipboard", { variant: "success" });

    return true;
  }

  function setGeneratedUrl(url: string) {
    generatedUrl.value = url;
  }

  function clearGeneratedUrl() {
    generatedUrl.value = "";
  }

  function clearUI() {
    generatedUrl.value = "";
    btnCount.value = 0;
    selectedRow.value = undefined;
  }

  function setGeneratingUrl(state: boolean) {
    isGeneratingUrl.value = state;
  }

  function setPolling(state: boolean) {
    isPolling.value = state;
  }

  function setBtnCount(count: number) {
    btnCount.value = count;
  }

  function setSelectedRow(row: Interaction | undefined) {
    selectedRow.value = row;
    // Sync to backend for cross-tab sync
    skipNextRowSelectedEvent = true;
    sdk.backend.setSelectedRowId(row?.uniqueId);
  }

  // Called when receiving event from another tab
  function setSelectedRowFromId(
    uniqueId: string | undefined,
    findInteraction: (id: string) => Interaction | undefined,
  ) {
    if (uniqueId === undefined) {
      selectedRow.value = undefined;
    } else {
      const interaction = findInteraction(uniqueId);
      if (interaction) {
        selectedRow.value = interaction;
      }
    }
  }

  // Subscribe to row selection events from other tabs
  function subscribeToRowSelected(
    findInteraction: (id: string) => Interaction | undefined,
  ) {
    return sdk.backend.onEvent(
      "onRowSelected",
      (uniqueId: string | undefined) => {
        if (skipNextRowSelectedEvent) {
          skipNextRowSelectedEvent = false;
          return;
        }
        setSelectedRowFromId(uniqueId, findInteraction);
      },
    );
  }

  return {
    isGeneratingUrl,
    isPolling,
    generatedUrl,
    btnCount,
    selectedRow,

    copyToClipboard,
    setGeneratedUrl,
    clearGeneratedUrl,
    setGeneratingUrl,
    setPolling,
    setSelectedRow,
    subscribeToRowSelected,
    setBtnCount,
    clearUI,
  };
});
