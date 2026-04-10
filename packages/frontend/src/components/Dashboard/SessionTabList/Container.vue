<script setup lang="ts">
import Card from "primevue/card";
import SplitButton from "primevue/splitbutton";
import { computed } from "vue";

import Tab from "./Tab.vue";

import { useNotificationsService } from "@/services/notifications";
import { useSessionsService } from "@/services/sessions";
import { useProvidersStore } from "@/stores/providers";

const sessionsService = useSessionsService();
const notificationsService = useNotificationsService();
const providersStore = useProvidersStore();

const state = computed(() => sessionsService.getState());

const sessions = computed(() => {
  const s = state.value;
  return s.type === "Success" ? s.sessions : [];
});

const selectedId = computed(() => sessionsService.selectedSession?.id);

const providerMenuItems = computed(() =>
  providersStore.providers
    .filter((p) => p.enabled)
    .map((p) => ({
      label: p.name,
      command: () => sessionsService.createSession(p.id),
    })),
);

const handleTabSelect = (sessionId: string) => {
  sessionsService.selectSession(sessionId);
};

const handleRename = (sessionId: string, newName: string) => {
  sessionsService.updateSessionTitle(sessionId, newName);
};

const handleDelete = (sessionId: string) => {
  sessionsService.deleteSession(sessionId);
};

const handleNewSession = () => {
  sessionsService.createSession();
};
</script>

<template>
  <Card
    class="h-fit shrink-0"
    :pt="{
      body: { class: 'h-fit p-0' },
      content: { class: 'h-fit' },
    }"
  >
    <template #content>
      <div class="flex flex-wrap items-center gap-2 px-4 py-3">
        <Tab
          v-for="session in sessions"
          :key="session.id"
          :is-selected="selectedId === session.id"
          :label="session.title"
          :status="session.status"
          :badge="notificationsService.getUnseenCount(session.id)"
          @select="handleTabSelect(session.id)"
          @rename="(newName) => handleRename(session.id, newName)"
          @delete="handleDelete(session.id)"
        />

        <SplitButton
          icon="fas fa-plus"
          size="small"
          :model="providerMenuItems"
          @click="handleNewSession"
        />
      </div>
    </template>
  </Card>
</template>
