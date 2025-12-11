import { defineStore } from "pinia";
import { ref } from "vue";

import { useInteractionStore } from "./interactionStore";

import { useSDK } from "@/plugins/sdk";
import { useUIStore } from "@/stores/uiStore";

export const useSettingsStore = defineStore("settings", () => {
  const sdk = useSDK();
  const interactionStore = useInteractionStore();
  const uiStore = useUIStore();

  const isDialogVisible = ref(false);
  const serverURL = ref("");
  const token = ref("");
  const pollingInterval = ref(30_000);
  const isSaving = ref(false);

  async function loadSettings() {
    try {
      const settings = await sdk.backend.getSettings();
      serverURL.value = settings.serverURL;
      token.value = settings.token;
      pollingInterval.value = settings.pollingInterval;
    } catch (error) {
      console.error(error);
      sdk.window.showToast("Failed to load settings", { variant: "error" });
    }
  }

  async function saveSettings() {
    isSaving.value = true;
    try {
      const prevSettings = await sdk.backend.getSettings();
      const serverURLChanged = prevSettings.serverURL !== serverURL.value;

      await sdk.backend.updateSettings({
        serverURL: serverURL.value,
        token: token.value,
        pollingInterval: pollingInterval.value,
      });

      if (serverURLChanged) {
        await interactionStore.resetClientService();
        interactionStore.clearData();
        uiStore.clearUI();
        sdk.window.showToast(
          "Server URL changed. Please generate a new URL.",
          { variant: "info" },
        );
      }

      sdk.window.showToast("Settings saved successfully", {
        variant: "success",
      });
      isDialogVisible.value = false;
    } catch (error) {
      console.error("Failed to save settings:", error);
      sdk.window.showToast("Failed to save settings", { variant: "error" });
    } finally {
      isSaving.value = false;
    }
  }

  async function resetSettings() {
    try {
      const prevSettings = await sdk.backend.getSettings();
      const needsReset = prevSettings.serverURL !== "https://oast.site";

      await sdk.backend.resetSettings();
      await loadSettings();

      if (needsReset) {
        await interactionStore.resetClientService();
        interactionStore.clearData();
        uiStore.clearGeneratedUrl();
        sdk.window.showToast("Settings reset. Please generate a new URL.", {
          variant: "info",
        });
      } else {
        sdk.window.showToast("Settings reset successfully", {
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Failed to reset settings:", error);
      sdk.window.showToast("Failed to reset settings", { variant: "error" });
    }
  }

  return {
    isDialogVisible,
    serverURL,
    token,
    pollingInterval,
    isSaving,
    loadSettings,
    saveSettings,
    resetSettings,
  };
});
