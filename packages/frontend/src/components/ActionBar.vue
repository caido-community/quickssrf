<script setup lang="ts">
import Button from "primevue/button";
import InputText from "primevue/inputtext";

import SettingsDialog from "./SettingsDialog.vue";

import { useLogic } from "@/composables/useLogic";
import { useInteractionStore } from "@/stores/interactionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";

const uiStore = useUIStore();
const interactionStore = useInteractionStore();
const settingsStore = useSettingsStore();
const { handleGenerateClick, handleManualPoll, handleClearData } = useLogic();
</script>

<template>
  <div class="flex justify-between items-center">
    <!-- Left side -->
    <div class="flex items-center gap-2">
      <Button
        v-tooltip="'Generate a unique URL and copy to clipboard'"
        label="Generate URL"
        :loading="uiStore.isGeneratingUrl"
        icon="fas fa-link"
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
</template>
