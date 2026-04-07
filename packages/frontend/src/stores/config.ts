import { defineStore } from "pinia";
import type { QuickSSRFConfig, UpdateConfig } from "shared";
import { ref } from "vue";

import { useSDK } from "@/plugins/sdk";

export const useConfigStore = defineStore("stores.config", () => {
  const sdk = useSDK();
  const data = ref<QuickSSRFConfig | undefined>(undefined);

  const initialize = async () => {
    await load();

    sdk.backend.onEvent("config:updated", (config) => {
      data.value = config;
    });
  };

  const load = async () => {
    const result = await sdk.backend.getConfig();
    if (result.kind === "Ok") {
      data.value = result.value;
    } else {
      sdk.window.showToast(result.error, { variant: "error" });
    }
  };

  const update = async (updates: UpdateConfig) => {
    const result = await sdk.backend.updateConfig(updates);
    if (result.kind === "Ok") {
      data.value = result.value;
      return true;
    }
    sdk.window.showToast(result.error, { variant: "error" });
    return false;
  };

  return { data, initialize, load, update };
});
