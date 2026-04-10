import { defineStore } from "pinia";
import type { CreateProvider, Provider, UpdateProvider } from "shared";
import { ref } from "vue";

import { useSDK } from "@/plugins/sdk";

export const useProvidersStore = defineStore("stores.providers", () => {
  const sdk = useSDK();
  const providers = ref<Provider[]>([]);
  const loading = ref(false);
  let initialized = false;

  const initialize = async () => {
    if (initialized) return;
    initialized = true;

    await load();

    sdk.backend.onEvent("provider:created", (provider) => {
      providers.value = [...providers.value, provider];
    });

    sdk.backend.onEvent("provider:updated", (provider) => {
      providers.value = providers.value.map((p) =>
        p.id === provider.id ? provider : p,
      );
    });

    sdk.backend.onEvent("provider:deleted", (providerId) => {
      providers.value = providers.value.filter((p) => p.id !== providerId);
    });
  };

  const load = async () => {
    loading.value = true;
    const result = await sdk.backend.getProviders();
    loading.value = false;

    if (result.kind === "Ok") {
      providers.value = result.value;
    } else {
      sdk.window.showToast(result.error, { variant: "error" });
    }
  };

  const addProvider = async (input: CreateProvider) => {
    const result = await sdk.backend.addProvider(input);
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
    }
    return result;
  };

  const updateProvider = async (id: string, updates: UpdateProvider) => {
    const result = await sdk.backend.updateProvider(id, updates);
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
    }
    return result;
  };

  const deleteProvider = async (id: string) => {
    const result = await sdk.backend.deleteProvider(id);
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
    }
    return result;
  };

  return {
    providers,
    loading,
    initialize,
    load,
    addProvider,
    updateProvider,
    deleteProvider,
  };
});
