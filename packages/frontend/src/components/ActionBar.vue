<script setup lang="ts">
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import SplitButton from "primevue/splitbutton";

import { computed, ref } from "vue";

import MultiUrlDialog from "./MultiUrlDialog.vue";
import SettingsDialog from "./SettingsDialog.vue";
import TaggedUrlDialog from "./TaggedUrlDialog.vue";
import UrlManagerDialog from "./UrlManagerDialog.vue";

import { useLogic } from "@/composables/useLogic";
import { useInteractionStore } from "@/stores/interactionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";

const uiStore = useUIStore();
const interactionStore = useInteractionStore();
const settingsStore = useSettingsStore();
const { handleGenerateClick, handleManualPoll, handleClearData } = useLogic();

const multiUrlDialogVisible = ref(false);
const taggedUrlDialogVisible = ref(false);
const urlManagerDialogVisible = ref(false);

const generateMenuItems = [
  {
    label: "Generate Tagged URL...",
    icon: "fas fa-tag",
    command: () => {
      taggedUrlDialogVisible.value = true;
    },
  },
  {
    label: "Generate Multiple...",
    icon: "fas fa-list",
    command: () => {
      multiUrlDialogVisible.value = true;
    },
  },
];

const selectedCount = computed(() => interactionStore.selectedRows.length);

function handleDeleteSelected() {
  interactionStore.deleteSelected();
}
</script>

<template>
  <div class="flex justify-between items-center">
    <!-- Left side -->
    <div class="flex items-center gap-2">
      <SplitButton
        v-tooltip="'Generate a unique URL and copy to clipboard'"
        label="Generate URL"
        :loading="uiStore.isGeneratingUrl"
        icon="fas fa-link"
        :model="generateMenuItems"
        @click="handleGenerateClick"
      />
      <div v-if="uiStore.generatedUrl" class="flex items-center">
        <InputText
          v-model="uiStore.generatedUrl"
          placeholder="Generated URL will appear here"
          readonly
          class="w-[400px] rounded-r-none"
        />
        <Button
          icon="fas fa-copy"
          class="rounded-l-none border-l-0"
          @click="uiStore.copyToClipboard(uiStore.generatedUrl, 'generatedUrl')"
        />
      </div>
    </div>

    <!-- Right side -->
    <div class="flex items-center gap-2">
      <!-- Delete Selected Button -->
      <Button
        v-if="selectedCount > 0"
        v-tooltip="'Delete selected interactions'"
        :label="`Delete (${selectedCount})`"
        severity="danger"
        icon="fas fa-trash"
        @click="handleDeleteSelected"
      />
      <Button
        v-tooltip="'Manually refresh to check for new interactions'"
        severity="danger"
        outlined
        icon="fas fa-sync"
        :loading="uiStore.isPolling"
        :disabled="!uiStore.generatedUrl"
        @click="handleManualPoll"
      />
      <Button
        v-tooltip="'Manage generated URLs'"
        icon="fas fa-list-ul"
        @click="urlManagerDialogVisible = true"
      />
      <Button
        v-tooltip="'Clear all interaction data'"
        :disabled="interactionStore.data.length === 0"
        icon="fas fa-trash"
        @click="handleClearData"
      />
      <Button
        v-tooltip="'Open settings'"
        icon="fas fa-cog"
        @click="settingsStore.isDialogVisible = true"
      />
    </div>
  </div>

  <SettingsDialog />
  <MultiUrlDialog v-model:visible="multiUrlDialogVisible" />
  <TaggedUrlDialog v-model:visible="taggedUrlDialogVisible" />
  <UrlManagerDialog v-model:visible="urlManagerDialogVisible" />
</template>
