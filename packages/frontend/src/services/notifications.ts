import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { useConfigStore } from "@/stores/config";
import type { FrontendSDK } from "@/types";

type SidebarItem = ReturnType<FrontendSDK["sidebar"]["registerItem"]>;

function createBeepPlayer(): () => void {
  let audioCtx: AudioContext | undefined;

  return () => {
    try {
      if (audioCtx === undefined) {
        audioCtx = new AudioContext();
      }

      if (audioCtx.state === "suspended") {
        void audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.06);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // AudioContext may be blocked by browser autoplay policy
    }
  };
}

export const useNotificationsService = defineStore(
  "services.notifications",
  () => {
    const configStore = useConfigStore();
    const unseenCounts = ref(new Map<string, number>());
    const pluginActive = ref(false);
    let sidebarItem: SidebarItem | undefined;

    const playBeep = createBeepPlayer();

    const totalUnseen = computed(() => {
      let total = 0;
      for (const count of unseenCounts.value.values()) {
        total += count;
      }
      return total;
    });

    const setSidebarItem = (item: SidebarItem) => {
      sidebarItem = item;
    };

    const updateBadge = () => {
      sidebarItem?.setCount(totalUnseen.value);
    };

    const setPluginActive = (active: boolean, selectedSessionId?: string) => {
      pluginActive.value = active;

      if (active && selectedSessionId !== undefined) {
        markSeen(selectedSessionId);
      }
    };

    const isViewingSession = (sessionId: string, selectedSessionId: string) => {
      return pluginActive.value && sessionId === selectedSessionId;
    };

    const onInteractionsReceived = (
      sessionId: string,
      count: number,
      selectedSessionId: string | undefined,
    ) => {
      if (configStore.data?.notificationsEnabled !== true) return;

      if (
        selectedSessionId !== undefined &&
        isViewingSession(sessionId, selectedSessionId)
      ) {
        return;
      }

      const current = unseenCounts.value.get(sessionId) ?? 0;
      const updated = new Map(unseenCounts.value);
      updated.set(sessionId, current + count);
      unseenCounts.value = updated;

      updateBadge();
      playBeep();
    };

    const markSeen = (sessionId: string) => {
      if (!unseenCounts.value.has(sessionId)) return;

      const updated = new Map(unseenCounts.value);
      updated.delete(sessionId);
      unseenCounts.value = updated;

      updateBadge();
    };

    const clearAll = () => {
      if (unseenCounts.value.size === 0) return;

      unseenCounts.value = new Map();
      updateBadge();
    };

    const getUnseenCount = (sessionId: string) => {
      return unseenCounts.value.get(sessionId) ?? 0;
    };

    return {
      unseenCounts,
      totalUnseen,
      pluginActive,
      setSidebarItem,
      setPluginActive,
      onInteractionsReceived,
      markSeen,
      clearAll,
      getUnseenCount,
    };
  },
);
