import { useSDK } from "@/plugins/sdk";
import { useClipboard } from "@vueuse/core";
import { defineStore } from "pinia";
import { ref } from "vue";
import type { Interaction } from "@/types";

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
    setBtnCount,
    clearUI,
  };
});
