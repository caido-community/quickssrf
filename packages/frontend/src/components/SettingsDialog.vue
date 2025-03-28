<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import { onBeforeUnmount, onMounted, ref } from "vue";

import { useSettingsStore } from "@/stores/settingsStore";

const settingsStore = useSettingsStore();
const showToken = ref(false);

onMounted(() => {
  settingsStore.loadSettings();
  document.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeyDown);
});

const toggleTokenVisibility = () => {
  showToken.value = !showToken.value;
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (
    settingsStore.isDialogVisible &&
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.ctrlKey
  ) {
    event.preventDefault();
    settingsStore.saveSettings();
  }
};
</script>

<template>
  <Dialog
    v-model:visible="settingsStore.isDialogVisible"
    modal
    header="Settings"
    :style="{ width: '500px' }"
    class="settings-dialog"
  >
    <div class="flex flex-col gap-4 p-2">
      <div class="flex flex-col gap-2">
        <label for="serverURL" class="font-medium text-sm">Server URL</label>
        <InputText
          id="serverURL"
          v-model="settingsStore.serverURL"
          placeholder="Enter server URL"
          class="p-2 w-full"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="token" class="font-medium text-sm">Token</label>
        <div class="flex w-full">
          <InputText
            id="token"
            v-model="settingsStore.token"
            :type="showToken ? 'text' : 'password'"
            placeholder="Enter token"
            class="p-2 w-full"
          />
          <Button
            :icon="showToken ? 'fas fa-eye-slash' : 'fas fa-eye'"
            class="ml-2"
            aria-label="Toggle token visibility"
            @click="toggleTokenVisibility"
          />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label for="pollingInterval" class="font-medium text-sm"
          >Polling Interval (ms)</label
        >
        <InputNumber
          id="pollingInterval"
          v-model="settingsStore.pollingInterval"
          :min="1000"
          :step="1000"
          class="w-full"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex items-center w-full gap-3 justify-between">
        <Button
          label="Reset"
          severity="danger"
          icon="fas fa-undo"
          class="px-3 py-2 text-sm font-medium"
          @click="settingsStore.resetSettings"
        />
        <Button
          label="Save"
          icon="fas fa-save"
          :loading="settingsStore.isSaving"
          class="px-3 py-2 text-sm font-medium"
          @click="settingsStore.saveSettings"
        />
      </div>
    </template>
  </Dialog>
</template>
