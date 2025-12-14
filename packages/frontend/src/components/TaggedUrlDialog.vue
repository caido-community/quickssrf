<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { ref, watch } from "vue";

import { useInteractionStore } from "@/stores/interactionStore";
import { useUIStore } from "@/stores/uiStore";

const interactionStore = useInteractionStore();
const uiStore = useUIStore();

const visible = defineModel<boolean>("visible", { default: false });
const tagValue = ref("");
const generatedUrl = ref<string | undefined>(undefined);
const isGenerating = ref(false);

// Focus input when dialog opens
watch(visible, (newVal) => {
  if (newVal) {
    tagValue.value = "";
    generatedUrl.value = undefined;
  }
});

async function handleGenerate() {
  if (!tagValue.value.trim()) {
    return;
  }

  isGenerating.value = true;
  generatedUrl.value = undefined;

  try {
    const url = await interactionStore.generateUrl(tagValue.value.trim());
    generatedUrl.value = url;

    if (url) {
      uiStore.setGeneratedUrl(url);
    }
  } finally {
    isGenerating.value = false;
  }
}

function copyUrl() {
  if (generatedUrl.value) {
    uiStore.copyToClipboard(generatedUrl.value, "url");
  }
}

function handleClose() {
  visible.value = false;
  tagValue.value = "";
  generatedUrl.value = undefined;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    header="Generate Tagged URL"
    modal
    :style="{ width: '500px' }"
    @hide="handleClose"
  >
    <div class="flex flex-col gap-4">
      <!-- Tag Input -->
      <div class="flex flex-col gap-2">
        <label for="tagInput" class="text-surface-400">
          Tag (will be applied to all interactions from this URL):
        </label>
        <div class="flex items-center gap-2">
          <InputText
            id="tagInput"
            v-model="tagValue"
            placeholder="e.g., login-form, header-injection, etc."
            class="flex-1"
            :disabled="isGenerating"
            autofocus
            @keyup.enter="handleGenerate"
          />
          <Button
            label="Generate"
            icon="fas fa-link"
            :loading="isGenerating"
            :disabled="!tagValue.trim()"
            @click="handleGenerate"
          />
        </div>
      </div>

      <!-- Generated URL -->
      <div v-if="generatedUrl" class="flex flex-col gap-2">
        <span class="text-surface-400 text-sm">Generated URL:</span>
        <div class="flex items-center gap-2">
          <InputText :model-value="generatedUrl" readonly class="flex-1" />
          <Button icon="fas fa-copy" severity="secondary" @click="copyUrl" />
        </div>
        <p class="text-sm text-surface-500">
          <i class="fas fa-info-circle mr-1"></i>
          All interactions received on this URL will be tagged with
          <span class="text-primary-500 font-medium">"{{ tagValue }}"</span>
        </p>
      </div>
    </div>
  </Dialog>
</template>
