<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import { ref } from "vue";

import { useInteractionStore } from "@/stores/interactionStore";
import { useUIStore } from "@/stores/uiStore";

const interactionStore = useInteractionStore();
const uiStore = useUIStore();

const visible = defineModel<boolean>("visible", { default: false });
const urlCount = ref(3);
const generatedUrls = ref<string[]>([]);
const isGenerating = ref(false);

async function handleGenerate() {
  isGenerating.value = true;
  generatedUrls.value = [];

  try {
    const urls = await interactionStore.generateMultipleUrls(urlCount.value);
    generatedUrls.value = urls;

    if (urls.length > 0 && urls[0]) {
      // Set the first URL as the main generated URL
      uiStore.setGeneratedUrl(urls[0]);
    }
  } finally {
    isGenerating.value = false;
  }
}

function copyUrl(url: string) {
  uiStore.copyToClipboard(url, "url");
}

function copyAllUrls() {
  const allUrls = generatedUrls.value.join("\n");
  uiStore.copyToClipboard(allUrls, "urls");
}

function handleClose() {
  visible.value = false;
  generatedUrls.value = [];
  urlCount.value = 3;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    header="Generate Multiple URLs"
    modal
    :style="{ width: '550px' }"
    @hide="handleClose"
  >
    <div class="flex flex-col gap-4">
      <!-- URL Count Input - stacked layout -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <label for="urlCount" class="text-surface-400 whitespace-nowrap">
            Number of URLs:
          </label>
          <InputNumber
            id="urlCount"
            v-model="urlCount"
            :min="1"
            :max="20"
            :disabled="isGenerating"
            class="w-20"
          />
        </div>
        <Button
          label="Generate URLs"
          icon="fas fa-link"
          :loading="isGenerating"
          class="w-full"
          @click="handleGenerate"
        />
      </div>

      <!-- Generated URLs List -->
      <div v-if="generatedUrls.length > 0" class="flex flex-col gap-2">
        <div class="flex justify-between items-center">
          <span class="text-surface-400 text-sm">
            Generated {{ generatedUrls.length }} URL(s):
          </span>
          <Button
            label="Copy All"
            icon="fas fa-copy"
            size="small"
            severity="secondary"
            @click="copyAllUrls"
          />
        </div>

        <div class="flex flex-col gap-1 max-h-64 overflow-y-auto">
          <div
            v-for="(url, index) in generatedUrls"
            :key="index"
            class="flex items-center gap-2"
          >
            <span class="text-surface-500 text-sm w-6">{{ index + 1 }}.</span>
            <InputText :model-value="url" readonly class="flex-1 text-sm" />
            <Button
              icon="fas fa-copy"
              severity="secondary"
              text
              size="small"
              @click="copyUrl(url)"
            />
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>
