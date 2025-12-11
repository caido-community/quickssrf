import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { sidebarItem } from "@/index";
import { useSDK } from "@/plugins/sdk";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import type { Interaction } from "@/types";
import { tryCatch } from "@/utils/try-catch";

export const useInteractionStore = defineStore("interaction", () => {
  const uiStore = useUIStore();
  const sdk = useSDK();

  const data = ref<Interaction[]>([]);
  const isStarted = ref(false);
  const lastInteractionIndex = ref(0);
  let pollingIntervalId: ReturnType<typeof setInterval> | undefined;

  const tableData = computed(() => {
    return data.value.map((item: Interaction, index: number) => {
      return {
        ...item,
        req: index + 1,
        dateTime: new Date(item.timestamp).toISOString(),
        protocol: item.protocol.toUpperCase(),
      };
    });
  });

  function processInteraction(
    interaction: Omit<Interaction, "httpPath">,
  ): Interaction {
    const result: Interaction = {
      ...interaction,
      httpPath: "",
    };

    // Extract HTTP path for HTTP requests
    if (result.protocol.toLowerCase() === "http") {
      const firstLine = result.rawRequest.split("\r\n")[0] || "";
      const parts = firstLine.split(" ");
      result.httpPath =
        parts.length >= 2 && parts[1]?.startsWith("/") ? parts[1] : "";
    }

    // Normalize line endings for DNS requests
    if (result.protocol.toLowerCase() === "dns") {
      result.rawRequest = result.rawRequest.split("\n").join("\r\n");
      result.rawResponse = result.rawResponse.split("\n").join("\r\n");
    }

    return result;
  }

  function addToData(response: Interaction) {
    if (window.location.hash !== "#/quickssrf") {
      uiStore.btnCount += 1;
      sidebarItem.setCount(uiStore.btnCount);
    }

    data.value.push(response);
  }

  async function fetchNewInteractions() {
    const { data: newInteractions, error } = await tryCatch(
      sdk.backend.getNewInteractions(lastInteractionIndex.value),
    );

    if (error) {
      console.error("Failed to fetch new interactions:", error);
      return;
    }

    if (newInteractions && newInteractions.length > 0) {
      for (const interaction of newInteractions) {
        const processed = processInteraction(interaction);
        addToData(processed);
      }
      lastInteractionIndex.value += newInteractions.length;
    }
  }

  function startPolling(intervalMs: number) {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
    }

    pollingIntervalId = setInterval(() => {
      fetchNewInteractions();
    }, intervalMs);
  }

  function stopPolling() {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = undefined;
    }
  }

  async function initializeService() {
    if (isStarted.value) return true;

    const settings = useSettingsStore();

    const { error } = await tryCatch(
      sdk.backend.startInteractsh({
        serverURL: settings.serverURL,
        token: settings.token,
        pollingInterval: settings.pollingInterval,
      }),
    );

    if (error) {
      console.error("Failed to initialize service:", error);
      return false;
    }

    isStarted.value = true;
    startPolling(settings.pollingInterval);
    return true;
  }

  async function resetClientService() {
    stopPolling();

    if (isStarted.value) {
      const { error } = await tryCatch(sdk.backend.stopInteractsh());
      if (error) {
        console.error("Error stopping client service:", error);
      }
      isStarted.value = false;
    }

    lastInteractionIndex.value = 0;
  }

  async function generateUrl() {
    const initialized = await initializeService();
    if (!initialized) {
      return null;
    }

    const { data: result, error } = await tryCatch(
      sdk.backend.generateInteractshUrl(),
    );

    if (error) {
      console.error("Failed to generate URL:", error);
      return null;
    }

    return result?.url || null;
  }

  async function manualPoll() {
    if (!isStarted.value) {
      throw new Error("Client service not initialized");
    }

    // Force backend to poll the Interactsh server
    await sdk.backend.pollInteractsh();
    // Then fetch the new interactions
    await fetchNewInteractions();
  }

  function clearData(resetService = false) {
    data.value = [];
    lastInteractionIndex.value = 0;

    uiStore.setBtnCount(0);
    sidebarItem.setCount(uiStore.btnCount);

    // Clear interactions on backend too
    sdk.backend.clearInteractions();

    if (resetService) {
      resetClientService();
    }

    return true;
  }

  return {
    data,
    tableData,
    generateUrl,
    manualPoll,
    clearData,
    resetClientService,
  };
});
