import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { sidebarItem } from "@/index";
import { useClientService } from "@/services/interactsh";
import type { Interaction } from "@/types";
import { useUIStore } from "@/stores/uiStore";
import { tryCatch } from "@/utils/try-catch";
import { useSettingsStore } from "@/stores/settingsStore";

export const useInteractionStore = defineStore("interaction", () => {
  const uiStore = useUIStore();

  const data = ref<Interaction[]>([]);
  const clientService = ref<ReturnType<typeof useClientService> | undefined>(
    undefined,
  );

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

  function parseData(json: Record<string, unknown>): Interaction {
    const result: Interaction = {
      protocol: String(json.protocol || "unknown"),
      uniqueId: String(json["unique-id"] || ""),
      fullId: String(json["full-id"] || ""),
      qType: String(json["q-type"] || ""),
      rawRequest: String(json["raw-request"] || ""),
      rawResponse: String(json["raw-response"] || ""),
      remoteAddress: String(json["remote-address"] || ""),
      timestamp: String(json.timestamp || new Date().toISOString()),
      httpPath: "",
    };

    // Extract HTTP path for HTTP requests
    if (result.protocol === "http") {
      const firstLine = result.rawRequest.split("\r\n")[0] || "";
      const parts = firstLine.split(" ");
      result.httpPath =
        parts.length >= 2 && parts[1]?.startsWith("/") ? parts[1] : "";
    }

    // Normalize line endings for DNS requests
    if (result.protocol === "dns") {
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

  async function initializeService() {
    if (clientService.value) return clientService.value;

    clientService.value = useClientService();
    if (!clientService.value) {
      throw new Error("Failed to create client service");
    }

    const settings = useSettingsStore();

    const { error } = await tryCatch(
      clientService.value.start(
        {
          serverURL: settings.serverURL,
          token: settings.token,
          keepAliveInterval: settings.pollingInterval,
        },
        (interaction: Record<string, unknown>) => {
          const resp = parseData(interaction);
          addToData(resp);
        },
      ),
    );

    if (error) {
      console.error("Failed to initialize service:", error);
      clientService.value = undefined;
      return undefined;
    }

    return clientService.value;
  }

  async function resetClientService() {
    if (clientService.value) {
      try {
        await clientService.value.stop();
      } catch (error) {
        console.error("Error stopping client service:", error);
      }
      clientService.value = undefined;
    }
  }

  async function getClientService() {
    return clientService.value;
  }

  async function generateUrl() {
    const service = await initializeService();
    if (!service) {
      return null;
    }
    return service.generateUrl(1).url || null;
  }

  async function manualPoll() {
    if (!clientService.value) {
      throw new Error("Client service not initialized");
    }

    const { error } = await tryCatch(clientService.value.poll());
    if (error) {
      console.error("Manual polling failed:", error);
      throw new Error("Failed to poll for interactions");
    }
  }

  function clearData(resetService = false) {
    data.value = [];

    uiStore.setBtnCount(0);
    sidebarItem.setCount(uiStore.btnCount);

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
    getClientService,
    resetClientService,
  };
});
