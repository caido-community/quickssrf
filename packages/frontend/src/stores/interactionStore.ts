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
  const filterQuery = ref("");
  const selectedRows = ref<Interaction[]>([]);
  const rowColors = ref<Record<string, string>>({});
  let pollingIntervalId: ReturnType<typeof setInterval> | undefined;

  // Filter condition type: field.operator:"value"
  type FilterCondition = {
    field: string;
    operator: string;
    value: string;
  };
  type FilterGroup = { conditions: FilterCondition[]; operator: "AND" | "OR" };

  // Parse HTTPQL-style filter: field.operator:"value" or field.operator:value
  function parseCondition(token: string): FilterCondition | null {
    // Match: field.operator:"value" or field.operator:value
    const match = token.match(/^(\w+)\.(\w+):["']?(.+?)["']?$/);
    if (match && match[1] && match[2] && match[3]) {
      return {
        field: match[1].toLowerCase(),
        operator: match[2].toLowerCase(),
        value: match[3],
      };
    }

    // Legacy format: field:value (treat as cont)
    const colonIndex = token.indexOf(":");
    if (colonIndex > 0) {
      const field = token.substring(0, colonIndex).toLowerCase();
      let value = token.substring(colonIndex + 1);
      value = value.replace(/^["']|["']$/g, ""); // Remove quotes
      if (value) {
        return { field, operator: "cont", value };
      }
    }

    return null;
  }

  // Parse HTTPQL-style filter query with AND/OR support
  function parseFilter(query: string): FilterGroup[] {
    const groups: FilterGroup[] = [];
    if (!query.trim()) return groups;

    // Split by OR first (lower precedence)
    const orParts = query.trim().split(/\s+OR\s+/i);

    for (const orPart of orParts) {
      // Split by AND or space (implicit AND)
      const andParts = orPart.trim().split(/\s+(?:AND\s+)?/i);
      const conditions: FilterCondition[] = [];

      for (const part of andParts) {
        const condition = parseCondition(part);
        if (condition) {
          conditions.push(condition);
        }
      }

      if (conditions.length > 0) {
        groups.push({ conditions, operator: "AND" });
      }
    }

    return groups;
  }

  // Get field value from item
  function getFieldValue(
    item: Interaction & { req: number; dateTime: string },
    field: string,
  ): string {
    switch (field) {
      case "protocol":
      case "type":
        return item.protocol.toLowerCase();
      case "ip":
      case "source":
        return item.remoteAddress.toLowerCase();
      case "path":
        return item.httpPath.toLowerCase();
      case "payload":
      case "id":
        return item.fullId.toLowerCase();
      default:
        return "";
    }
  }

  // Apply operator to check if value matches
  function applyOperator(
    fieldValue: string,
    operator: string,
    filterValue: string,
  ): boolean {
    const lowerFilterValue = filterValue.toLowerCase();

    switch (operator) {
      case "eq":
        return fieldValue === lowerFilterValue;
      case "ne":
        return fieldValue !== lowerFilterValue;
      case "cont":
        return fieldValue.includes(lowerFilterValue);
      case "ncont":
        return !fieldValue.includes(lowerFilterValue);
      case "like":
        // Convert SQL LIKE pattern to regex: % -> .*, _ -> .
        const likePattern = lowerFilterValue
          .replace(/%/g, ".*")
          .replace(/_/g, ".");
        return new RegExp(`^${likePattern}$`, "i").test(fieldValue);
      case "nlike":
        const nlikePattern = lowerFilterValue
          .replace(/%/g, ".*")
          .replace(/_/g, ".");
        return !new RegExp(`^${nlikePattern}$`, "i").test(fieldValue);
      case "regex":
        try {
          return new RegExp(filterValue, "i").test(fieldValue);
        } catch {
          return false;
        }
      case "nregex":
        try {
          return !new RegExp(filterValue, "i").test(fieldValue);
        } catch {
          return true;
        }
      default:
        // Default to contains
        return fieldValue.includes(lowerFilterValue);
    }
  }

  // Check if a single condition matches
  function matchesCondition(
    item: Interaction & { req: number; dateTime: string },
    condition: FilterCondition,
  ): boolean {
    const fieldValue = getFieldValue(item, condition.field);
    return applyOperator(fieldValue, condition.operator, condition.value);
  }

  // Check if interaction matches filter groups (OR between groups, AND within group)
  function matchesFilter(
    item: Interaction & { req: number; dateTime: string },
    groups: FilterGroup[],
  ): boolean {
    if (groups.length === 0) return true;

    // OR between groups: at least one group must match
    return groups.some((group) => {
      // AND within group: all conditions must match
      return group.conditions.every((condition) =>
        matchesCondition(item, condition),
      );
    });
  }

  const tableData = computed(() => {
    return data.value.map((item: Interaction, index: number) => {
      const date = new Date(item.timestamp);
      return {
        ...item,
        req: index + 1,
        dateTime: date.toISOString(),
        localDateTime: date.toLocaleString(),
        protocol: item.protocol.toUpperCase(),
      };
    });
  });

  const filteredTableData = computed(() => {
    const groups = parseFilter(filterQuery.value);
    if (groups.length === 0) return tableData.value;
    return tableData.value.filter((item) => matchesFilter(item, groups));
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

    // Get effective server URL (handles random mode)
    const effectiveServerUrl = settings.getEffectiveServerUrl();

    const { error } = await tryCatch(
      sdk.backend.startInteractsh({
        serverURL: effectiveServerUrl,
        token: settings.token,
        pollingInterval: settings.pollingInterval,
        correlationIdLength: settings.correlationIdLength,
        correlationIdNonceLength: settings.correlationIdNonceLength,
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

    const settings = useSettingsStore();
    // Get effective server URL (handles random mode - picks a new random server each time)
    const serverUrl = settings.getEffectiveServerUrl();

    const { data: result, error } = await tryCatch(
      sdk.backend.generateInteractshUrl(serverUrl),
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
    selectedRows.value = [];

    uiStore.setBtnCount(0);
    sidebarItem.setCount(uiStore.btnCount);

    // Clear interactions on backend too
    sdk.backend.clearInteractions();

    if (resetService) {
      resetClientService();
    }

    return true;
  }

  // Delete a single interaction by uniqueId
  function deleteInteraction(uniqueId: string) {
    const index = data.value.findIndex((item) => item.uniqueId === uniqueId);
    if (index !== -1) {
      data.value.splice(index, 1);
    }
    // Also remove from selection if present
    selectedRows.value = selectedRows.value.filter(
      (item) => item.uniqueId !== uniqueId,
    );
    // Also remove color if present
    delete rowColors.value[uniqueId];
  }

  // Delete all selected interactions
  function deleteSelected() {
    const selectedIds = new Set(selectedRows.value.map((item) => item.uniqueId));
    data.value = data.value.filter((item) => !selectedIds.has(item.uniqueId));
    // Also remove colors
    for (const id of selectedIds) {
      delete rowColors.value[id];
    }
    selectedRows.value = [];
  }

  // Clear filter
  function clearFilter() {
    filterQuery.value = "";
  }

  // Set row color
  function setRowColor(fullId: string, color: string | null) {
    if (color === null) {
      delete rowColors.value[fullId];
    } else {
      rowColors.value[fullId] = color;
    }
  }

  // Get row color
  function getRowColor(fullId: string): string | undefined {
    return rowColors.value[fullId];
  }

  // Generate multiple URLs
  async function generateMultipleUrls(count: number): Promise<string[]> {
    const initialized = await initializeService();
    if (!initialized) {
      return [];
    }

    const settings = useSettingsStore();
    const urls: string[] = [];
    for (let i = 0; i < count; i++) {
      // Get effective server URL for each URL (random mode picks different servers)
      const serverUrl = settings.getEffectiveServerUrl();
      const { data: result, error } = await tryCatch(
        sdk.backend.generateInteractshUrl(serverUrl),
      );
      if (error) {
        console.error(`Failed to generate URL ${i + 1}:`, error);
        continue;
      }
      if (result?.url) {
        urls.push(result.url);
      }
    }
    return urls;
  }

  return {
    data,
    tableData,
    filteredTableData,
    filterQuery,
    selectedRows,
    rowColors,
    generateUrl,
    generateMultipleUrls,
    manualPoll,
    clearData,
    clearFilter,
    deleteInteraction,
    deleteSelected,
    resetClientService,
    setRowColor,
    getRowColor,
  };
});
