<script setup lang="ts">
import Button from "primevue/button";
import ConfirmDialog from "primevue/confirmdialog";
import MenuBar from "primevue/menubar";
import { useConfirm } from "primevue/useconfirm";
import { onMounted } from "vue";

import { useAppNavigation } from "@/composables/useAppNavigation";
import { useSessionsService } from "@/services/sessions";
import { useConfigStore } from "@/stores/config";
import { useProvidersStore } from "@/stores/providers";

const { navItems, component } = useAppNavigation();
const confirm = useConfirm();

const sessionsService = useSessionsService();
const configStore = useConfigStore();
const providersStore = useProvidersStore();

const handleLabel = (
  label: string | ((...args: unknown[]) => string) | undefined,
) => {
  if (typeof label === "function") {
    return label();
  }
  return label;
};

const onClearAll = () => {
  confirm.require({
    message:
      "This will delete all sessions and their interactions. This action cannot be undone.",
    header: "Clear All Sessions",
    icon: "fas fa-exclamation-triangle",
    acceptLabel: "Delete All",
    rejectLabel: "Cancel",
    accept: () => {
      sessionsService.clearAllSessions();
    },
  });
};

onMounted(() => {
  sessionsService.initialize();
  configStore.initialize();
  providersStore.initialize();
});
</script>

<template>
  <div class="h-full flex flex-col gap-1">
    <ConfirmDialog />
    <MenuBar :model="navItems" class="h-12 gap-2">
      <template #start>
        <div class="px-2 font-bold">QuickSSRF</div>
      </template>

      <template #item="{ item }">
        <Button
          :severity="item.isActive?.() ? 'secondary' : 'contrast'"
          :outlined="item.isActive?.()"
          size="small"
          :text="!item.isActive?.()"
          :label="handleLabel(item.label)"
          @mousedown="item.command?.()"
        />
      </template>

      <template #end>
        <Button
          label="Clear All"
          icon="fas fa-trash"
          severity="danger"
          text
          size="small"
          @click="onClearAll"
        />
      </template>
    </MenuBar>
    <div class="flex-1 min-h-0">
      <component :is="component" />
    </div>
  </div>
</template>
