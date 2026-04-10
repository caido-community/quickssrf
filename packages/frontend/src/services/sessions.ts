import { defineStore } from "pinia";
import type { Interaction } from "shared";
import { computed, ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useNotificationsService } from "@/services/notifications";
import { useSessionsStore } from "@/stores/sessions";

export const useSessionsService = defineStore("services.sessions", () => {
  const sdk = useSDK();
  const store = useSessionsStore();
  const notificationsService = useNotificationsService();
  const interactions = ref<Interaction[]>([]);
  let initialized = false;

  const getState = () => store.getState();

  const selectedSession = computed(() => {
    const id = store.selectionState.getState();
    const state = store.getState();
    if (id !== undefined && state.type === "Success") {
      return state.sessions.find((s) => s.id === id);
    }
    return undefined;
  });

  const initialize = async () => {
    if (initialized) return;
    initialized = true;

    sdk.backend.onEvent("session:created", (session) => {
      store.send({ type: "AddSession", session });
    });

    sdk.backend.onEvent("session:updated", (session) => {
      store.send({ type: "UpdateSession", session });
    });

    sdk.backend.onEvent("session:deleted", (sessionId) => {
      store.send({ type: "DeleteSession", sessionId });
      notificationsService.markSeen(sessionId);
      if (store.selectionState.getState() === sessionId) {
        store.selectionState.reset();
        interactions.value = [];
      }
    });

    sdk.backend.onEvent("interaction:received", (data) => {
      const selectedId = store.selectionState.getState();

      if (data.sessionId === selectedId) {
        const existingKeys = new Set(
          interactions.value.map(
            (i) => `${i.uniqueId}:${i.timestamp}:${i.protocol}`,
          ),
        );
        const newOnes = data.interactions.filter(
          (i) =>
            !existingKeys.has(`${i.uniqueId}:${i.timestamp}:${i.protocol}`),
        );
        if (newOnes.length > 0) {
          interactions.value = [...interactions.value, ...newOnes];
        }
      }

      notificationsService.onInteractionsReceived(
        data.sessionId,
        data.interactions.length,
        selectedId,
      );
    });

    store.send({ type: "Start" });
    const result = await sdk.backend.getSessions();

    if (result.kind === "Ok") {
      store.send({ type: "Success", sessions: result.value });
    } else {
      store.send({ type: "Error", error: result.error });
    }
  };

  const createSession = async (providerId?: string) => {
    const result =
      providerId !== undefined
        ? await sdk.backend.createSession(providerId)
        : await sdk.backend.createSession();
    if (result.kind === "Ok") {
      selectSession(result.value.id);
      sdk.window.showToast("Session created", { variant: "success" });
    } else {
      sdk.window.showToast(result.error, { variant: "error" });
    }
    return result;
  };

  const selectSession = async (sessionId: string) => {
    store.selectionState.select(sessionId);
    const result = await sdk.backend.getInteractions(sessionId);
    if (result.kind === "Ok") {
      interactions.value = result.value;
      notificationsService.markSeen(sessionId);
    }
  };

  const stopSession = async (sessionId: string) => {
    const result = await sdk.backend.stopSession(sessionId);
    if (result.kind === "Ok") {
      sdk.window.showToast("Session stopped", { variant: "success" });
    } else {
      sdk.window.showToast(result.error, { variant: "error" });
    }
  };

  const deleteSession = async (sessionId: string) => {
    const isSelected = store.selectionState.getState() === sessionId;
    const result = await sdk.backend.deleteSession(sessionId);

    if (result.kind === "Ok") {
      sdk.window.showToast("Session deleted", { variant: "success" });
      if (isSelected) {
        store.selectionState.reset();
        interactions.value = [];
      }
    } else {
      sdk.window.showToast(result.error, { variant: "error" });
    }
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    const result = await sdk.backend.updateSessionTitle(sessionId, title);
    if (result.kind === "Ok") {
      store.send({ type: "UpdateSession", session: result.value });
    } else {
      sdk.window.showToast(result.error, { variant: "error" });
    }
  };

  const pollSession = async (sessionId: string) => {
    const result = await sdk.backend.pollSession(sessionId);
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
    }
    return result;
  };

  const clearSelection = () => {
    store.selectionState.reset();
    interactions.value = [];
  };

  const clearAllSessions = async () => {
    const state = store.getState();
    if (state.type !== "Success") return;

    const errors: string[] = [];
    for (const session of [...state.sessions]) {
      const result = await sdk.backend.deleteSession(session.id);
      if (result.kind === "Error") {
        errors.push(result.error);
      }
    }

    store.selectionState.reset();
    interactions.value = [];
    notificationsService.clearAll();

    if (errors.length > 0) {
      sdk.window.showToast(
        `Cleared with ${errors.length} error(s): ${errors[0]}`,
        { variant: "warning" },
      );
    } else {
      sdk.window.showToast("All sessions cleared", { variant: "success" });
    }
  };

  return {
    getState,
    selectedSession,
    interactions,
    initialize,
    createSession,
    selectSession,
    stopSession,
    deleteSession,
    updateSessionTitle,
    pollSession,
    clearSelection,
    clearAllSessions,
  };
});
