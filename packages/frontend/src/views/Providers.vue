<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import SplitButton from "primevue/splitbutton";
import { QUICK_ADD_PRESETS } from "shared";
import { computed, ref } from "vue";

import { Providers as ProvidersContent } from "@/components/Providers";
import { useProvidersStore } from "@/stores/providers";

const providersStore = useProvidersStore();
const providersRef = ref<InstanceType<typeof ProvidersContent>>();

const existingUrls = computed(
  () => new Set(providersStore.providers.map((p) => p.url)),
);

const availablePresets = computed(() =>
  QUICK_ADD_PRESETS.filter((p) => !existingUrls.value.has(p.url)),
);

const allPresetsAdded = computed(() => availablePresets.value.length === 0);

const quickAddItems = computed(() =>
  availablePresets.value.map((preset) => ({
    label: preset.name,
    command: () => {
      providersStore.addProvider({ ...preset, token: undefined });
    },
  })),
);

const onQuickAddRandom = () => {
  const presets = availablePresets.value;
  if (presets.length === 0) return;
  const random = presets[Math.floor(Math.random() * presets.length)]!;
  providersStore.addProvider({ ...random, token: undefined });
};

const onCustom = () => {
  providersRef.value?.openCustomDialog();
};
</script>

<template>
  <div class="h-full flex flex-col gap-1 min-h-0">
    <Card
      class="shrink-0"
      :pt="{
        body: { class: 'p-0' },
        content: { class: 'p-0' },
      }"
    >
      <template #content>
        <div class="flex justify-between items-center px-4 py-3">
          <div>
            <h3 class="text-lg font-semibold">Providers</h3>
            <p class="text-sm text-surface-400">
              Manage OAST backends that generate payload URLs and capture
              interactions
            </p>
          </div>
          <div class="flex gap-2">
            <SplitButton
              label="Quick Add"
              icon="fas fa-bolt"
              size="small"
              :model="quickAddItems"
              :disabled="allPresetsAdded"
              @click="onQuickAddRandom"
            />
            <Button
              label="Custom"
              icon="fas fa-plus"
              size="small"
              @click="onCustom"
            />
          </div>
        </div>
      </template>
    </Card>

    <Card
      class="flex-1 min-h-0"
      :pt="{
        root: {
          style: 'display: flex; flex-direction: column; height: 100%;',
        },
        body: { class: 'flex-1 p-0 flex flex-col min-h-0' },
        content: { class: 'flex-1 flex flex-col overflow-hidden min-h-0' },
      }"
    >
      <template #content>
        <div class="flex-1 min-h-0 overflow-auto">
          <ProvidersContent ref="providersRef" />
        </div>
      </template>
    </Card>
  </div>
</template>
