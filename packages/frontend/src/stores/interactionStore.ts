import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { sidebarItem } from "@/index";
import { useSDK } from "@/plugins/sdk";
import { SERVER_PRESETS, useSettingsStore } from "@/stores/settingsStore";
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

  // Flag to skip next data change event (when we made the change ourselves)
  let skipNextDataChangeEvent = false;
  // Flag to skip next filter change event (when we made the change ourselves)
  let skipNextFilterChangeEvent = false;

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
    item: Interaction & { req: number; dateTime: string; payloadUrl?: string },
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
        return (item.httpPath || "").toLowerCase();
      case "payload":
      case "id":
        return (item.payloadUrl || item.fullId).toLowerCase();
      case "tag":
        return (item.tag || "").toLowerCase();
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
      // Build full payload URL: fullId.serverDomain
      let payloadUrl = item.fullId;
      if (item.serverUrl) {
        try {
          const serverDomain = new URL(item.serverUrl).hostname;
          payloadUrl = `${item.fullId}.${serverDomain}`;
        } catch {
          // Keep original fullId if URL parsing fails
        }
      }
      return {
        ...item,
        req: index + 1,
        dateTime: date.toISOString(),
        localDateTime: date.toLocaleString(),
        protocol: item.protocol.toUpperCase(),
        payloadUrl,
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

    // If random mode is enabled, pre-initialize all server clients in background
    if (settings.serverMode === "random") {
      const allServerUrls = SERVER_PRESETS
        .filter((p) => p.value !== "random" && p.value !== "custom")
        .map((p) => p.value);
      sdk.backend.initializeClients(allServerUrls).then((count) => {
        console.log(`Pre-initialized ${count} server clients for random mode`);
      }).catch((err) => {
        console.error("Failed to pre-initialize clients:", err);
      });
    }

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

  async function generateUrl(tag?: string) {
    const initialized = await initializeService();
    if (!initialized) {
      return null;
    }

    const settings = useSettingsStore();
    // Get effective server URL (handles random mode - picks a new random server each time)
    const serverUrl = settings.getEffectiveServerUrl();

    // Only pass tag if it's defined (Caido API doesn't handle undefined well)
    const { data: result, error } = await tryCatch(
      tag
        ? sdk.backend.generateInteractshUrl(serverUrl, tag)
        : sdk.backend.generateInteractshUrl(serverUrl),
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

    // Skip next event since we're making the change ourselves
    skipNextDataChangeEvent = true;

    // Force backend to poll the Interactsh server (notify other tabs)
    await sdk.backend.pollInteractsh(true);
    // Then fetch the new interactions
    await fetchNewInteractions();
  }

  function clearData(resetService = false) {
    // Skip next event since we're making the change
    skipNextDataChangeEvent = true;

    data.value = [];
    lastInteractionIndex.value = 0;
    selectedRows.value = [];
    rowColors.value = {};

    uiStore.setBtnCount(0);
    sidebarItem.setCount(uiStore.btnCount);

    // Clear all data on backend (interactions + URLs + persisted data)
    sdk.backend.clearAllData();

    if (resetService) {
      resetClientService();
    }

    return true;
  }

  // Delete a single interaction by uniqueId
  async function deleteInteraction(uniqueId: string) {
    // Skip next event since we're making the change
    skipNextDataChangeEvent = true;

    // Delete from backend first
    await sdk.backend.deleteInteraction(uniqueId);

    // Then update local state
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
  async function deleteSelected() {
    // Skip next event since we're making the change
    skipNextDataChangeEvent = true;

    const selectedIds = selectedRows.value.map((item) => item.uniqueId);

    // Delete from backend first
    await sdk.backend.deleteInteractions(selectedIds);

    // Then update local state
    const selectedIdsSet = new Set(selectedIds);
    data.value = data.value.filter((item) => !selectedIdsSet.has(item.uniqueId));
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

  // Load persisted data from backend and restore service state
  async function loadPersistedData() {
    const uiStore = useUIStore();
    const settings = useSettingsStore();

    // Check if backend service is already started
    const { data: status, error: statusError } = await tryCatch(
      sdk.backend.getInteractshStatus(),
    );

    if (!statusError && status?.isStarted) {
      // Backend is already running, sync frontend state
      isStarted.value = true;
      startPolling(settings.pollingInterval);
      console.log("Backend service already running, synced frontend state");
    }

    // Load interactions
    const { data: interactions, error } = await tryCatch(
      sdk.backend.getInteractions(),
    );

    if (!error && interactions && interactions.length > 0) {
      // Process interactions to add httpPath
      for (const interaction of interactions) {
        const processed = processInteraction(interaction);
        data.value.push(processed);
      }
      lastInteractionIndex.value = interactions.length;
      console.log(`Loaded ${interactions.length} interactions from backend`);
    }

    // Load last generated URL from active URLs
    const { data: activeUrls, error: urlsError } = await tryCatch(
      sdk.backend.getActiveUrls(),
    );

    if (!urlsError && activeUrls && activeUrls.length > 0) {
      // Get the most recent URL (last in array)
      const lastUrl = activeUrls[activeUrls.length - 1];
      if (lastUrl) {
        uiStore.setGeneratedUrl(lastUrl.url);
        console.log(`Restored last generated URL: ${lastUrl.url}`);
      }
    }
  }

  // Reload all data from backend (called when data changes externally)
  async function reloadData() {
    const { data: interactions, error } = await tryCatch(
      sdk.backend.getInteractions(),
    );

    if (error) {
      console.error("Failed to reload data:", error);
      return;
    }

    // Clear current data and reload
    data.value = [];
    selectedRows.value = [];

    if (interactions && interactions.length > 0) {
      for (const interaction of interactions) {
        const processed = processInteraction(interaction);
        data.value.push(processed);
      }
      lastInteractionIndex.value = interactions.length;
      console.log(`Reloaded ${interactions.length} interactions from backend`);
    } else {
      lastInteractionIndex.value = 0;
    }
  }

  // Subscribe to backend data change events
  function subscribeToDataChanges() {
    const subscription = sdk.backend.onEvent("onDataChanged", () => {
      // Skip if we made the change ourselves
      if (skipNextDataChangeEvent) {
        skipNextDataChangeEvent = false;
        console.log("Data changed event received, skipping (self-triggered)");
        return;
      }
      console.log("Data changed event received, reloading...");
      reloadData();
    });
    return subscription;
  }

  // Subscribe to URL generation events
  function subscribeToUrlGenerated() {
    const uiStore = useUIStore();
    const subscription = sdk.backend.onEvent("onUrlGenerated", (url: string) => {
      console.log("URL generated event received:", url);
      uiStore.setGeneratedUrl(url);
    });
    return subscription;
  }

  // Subscribe to filter change events
  function subscribeToFilterChanged() {
    const subscription = sdk.backend.onEvent("onFilterChanged", (filter: string) => {
      // Skip if we made the change ourselves
      if (skipNextFilterChangeEvent) {
        skipNextFilterChangeEvent = false;
        console.log("Filter changed event received, skipping (self-triggered)");
        return;
      }
      console.log("Filter changed event received:", filter);
      filterQuery.value = filter;
    });
    return subscription;
  }

  // Update filter and sync to backend
  function setFilterQuery(value: string) {
    if (filterQuery.value !== value) {
      filterQuery.value = value;
      // Skip next event since we're making the change
      skipNextFilterChangeEvent = true;
      sdk.backend.setFilter(value);
    }
  }

  // Load filter from backend
  async function loadFilter() {
    const { data: filter, error } = await tryCatch(sdk.backend.getFilter());
    if (!error && filter !== undefined) {
      filterQuery.value = filter;
      console.log(`Loaded filter from backend: "${filter}"`);
    }
  }

  // Update tag for an interaction
  async function setInteractionTag(uniqueId: string, tag: string | undefined) {
    // Skip next event since we're making the change
    skipNextDataChangeEvent = true;

    // Update backend first
    await sdk.backend.setInteractionTag(uniqueId, tag);

    // Then update local state
    const interaction = data.value.find((item) => item.uniqueId === uniqueId);
    if (interaction) {
      interaction.tag = tag;
    }
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
    loadPersistedData,
    reloadData,
    subscribeToDataChanges,
    subscribeToUrlGenerated,
    subscribeToFilterChanged,
    setFilterQuery,
    loadFilter,
    setInteractionTag,
  };
});
