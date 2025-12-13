import { defineStore } from "pinia";
import { ref } from "vue";

import { useInteractionStore } from "./interactionStore";

import { useSDK } from "@/plugins/sdk";
import { useUIStore } from "@/stores/uiStore";

export const SERVER_PRESETS = [
  { label: "Random", value: "random" },
  { label: "oast.site", value: "https://oast.site" },
  { label: "oast.fun", value: "https://oast.fun" },
  { label: "oast.me", value: "https://oast.me" },
  { label: "oast.pro", value: "https://oast.pro" },
  { label: "oast.live", value: "https://oast.live" },
  { label: "Custom", value: "custom" },
];

export const useSettingsStore = defineStore("settings", () => {
  const sdk = useSDK();
  const interactionStore = useInteractionStore();
  const uiStore = useUIStore();

  const isDialogVisible = ref(false);
  const serverURL = ref("");
  const serverMode = ref("https://oast.site"); // "random", "custom", or a preset URL
  const token = ref("");
  const pollingInterval = ref(30_000);
  const correlationIdLength = ref(20);
  const correlationIdNonceLength = ref(13);
  const isSaving = ref(false);

  // Get list of actual server URLs (excluding random and custom)
  function getServerUrls(): string[] {
    return SERVER_PRESETS
      .filter((p) => p.value !== "random" && p.value !== "custom")
      .map((p) => p.value);
  }

  // Get the actual server URL to use (handles random mode)
  function getEffectiveServerUrl(): string {
    if (serverMode.value === "random") {
      const servers = getServerUrls();
      const randomIndex = Math.floor(Math.random() * servers.length);
      return servers[randomIndex]!;
    }
    if (serverMode.value === "custom") {
      return serverURL.value;
    }
    return serverMode.value;
  }

  async function loadSettings() {
    try {
      const settings = await sdk.backend.getSettings();
      serverURL.value = settings.serverURL;
      token.value = settings.token;
      pollingInterval.value = settings.pollingInterval;
      correlationIdLength.value = settings.correlationIdLength;
      correlationIdNonceLength.value = settings.correlationIdNonceLength;

      // Determine serverMode from serverURL
      if (settings.serverURL === "random") {
        serverMode.value = "random";
      } else {
        const preset = SERVER_PRESETS.find((p) => p.value === settings.serverURL);
        if (preset && preset.value !== "custom") {
          serverMode.value = preset.value;
        } else {
          serverMode.value = "custom";
        }
      }
    } catch (error) {
      console.error(error);
      sdk.window.showToast("Failed to load settings", { variant: "error" });
    }
  }

  async function saveSettings() {
    isSaving.value = true;
    try {
      const prevSettings = await sdk.backend.getSettings();

      // Determine the URL to save based on mode
      const urlToSave = serverMode.value === "random"
        ? "random"
        : serverMode.value === "custom"
          ? serverURL.value
          : serverMode.value;

      const serverURLChanged = prevSettings.serverURL !== urlToSave;
      const correlationIdLengthChanged =
        prevSettings.correlationIdLength !== correlationIdLength.value;
      const correlationIdNonceLengthChanged =
        prevSettings.correlationIdNonceLength !==
        correlationIdNonceLength.value;
      const needsRestart =
        serverURLChanged ||
        correlationIdLengthChanged ||
        correlationIdNonceLengthChanged;

      await sdk.backend.updateSettings({
        serverURL: urlToSave,
        token: token.value,
        pollingInterval: pollingInterval.value,
        correlationIdLength: correlationIdLength.value,
        correlationIdNonceLength: correlationIdNonceLength.value,
      });

      if (needsRestart) {
        await interactionStore.resetClientService();
        interactionStore.clearData();
        uiStore.clearUI();
        // Clear managed URLs since they belong to the old server configuration
        sdk.backend.clearUrls();
        sdk.window.showToast("Settings changed. Please generate a new URL.", {
          variant: "info",
        });
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
      const needsRestart =
        prevSettings.serverURL !== "https://oast.site" ||
        prevSettings.correlationIdLength !== 20 ||
        prevSettings.correlationIdNonceLength !== 13;

      await sdk.backend.resetSettings();
      await loadSettings();

      if (needsRestart) {
        await interactionStore.resetClientService();
        interactionStore.clearData();
        uiStore.clearGeneratedUrl();
        // Clear managed URLs since they belong to the old server configuration
        sdk.backend.clearUrls();
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
    serverMode,
    token,
    pollingInterval,
    correlationIdLength,
    correlationIdNonceLength,
    isSaving,
    loadSettings,
    saveSettings,
    resetSettings,
    getEffectiveServerUrl,
  };
});
