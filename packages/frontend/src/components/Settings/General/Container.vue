<script setup lang="ts">
import Card from "primevue/card";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import { computed } from "vue";

import { useConfigStore } from "@/stores/config";
import { useProvidersStore } from "@/stores/providers";

const configStore = useConfigStore();
const providersStore = useProvidersStore();

const providerOptions = computed(() =>
  providersStore.providers.map((p) => ({
    label: p.name,
    value: p.id,
  })),
);

const defaultProviderId = computed({
  get: () => configStore.data?.defaultProviderId,
  set: (value) => {
    configStore.update({ defaultProviderId: value });
  },
});

const pollingInterval = computed({
  get: () => configStore.data?.pollingInterval ?? 5000,
  set: (value) => {
    if (value !== undefined) {
      configStore.update({ pollingInterval: value });
    }
  },
});

const autoPolling = computed({
  get: () => configStore.data?.autoPolling ?? true,
  set: (value) => {
    configStore.update({ autoPolling: value });
  },
});

const notificationsEnabled = computed({
  get: () => configStore.data?.notificationsEnabled ?? false,
  set: (value) => {
    configStore.update({ notificationsEnabled: value });
  },
});

const correlationIdLength = computed({
  get: () => configStore.data?.correlationIdLength ?? 20,
  set: (value) => {
    if (value !== undefined) {
      configStore.update({ correlationIdLength: value });
    }
  },
});

const correlationIdNonceLength = computed({
  get: () => configStore.data?.correlationIdNonceLength ?? 13,
  set: (value) => {
    if (value !== undefined) {
      configStore.update({ correlationIdNonceLength: value });
    }
  },
});
</script>

<template>
  <Card
    class="h-full"
    :pt="{
      body: { class: 'p-4' },
      content: { class: 'flex flex-col' },
    }"
  >
    <template #content>
      <div class="flex flex-col gap-5">
        <div class="flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <label class="text-sm font-medium">Default Provider</label>
            <p class="text-sm text-surface-400">
              Provider used when creating new sessions
            </p>
          </div>
          <div class="w-48 shrink-0">
            <Select
              v-model="defaultProviderId"
              :options="providerOptions"
              option-label="label"
              option-value="value"
              placeholder="First enabled"
              show-clear
              class="w-full"
            />
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <label class="text-sm font-medium">Polling Interval</label>
            <p class="text-sm text-surface-400">
              How often to check for new interactions (ms)
            </p>
          </div>
          <div class="w-48 shrink-0">
            <InputNumber
              v-model="pollingInterval"
              :min="1000"
              :max="60000"
              :step="1000"
              suffix=" ms"
              class="w-full"
            />
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <label class="text-sm font-medium">Auto-Polling</label>
            <p class="text-sm text-surface-400">
              Automatically poll all active sessions
            </p>
          </div>
          <div class="w-48 shrink-0 flex justify-end">
            <ToggleSwitch v-model="autoPolling" />
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <label class="text-sm font-medium">Notifications</label>
            <p class="text-sm text-surface-400">
              Notify when new interactions are received
            </p>
          </div>
          <div class="w-48 shrink-0 flex justify-end">
            <ToggleSwitch v-model="notificationsEnabled" />
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <label class="text-sm font-medium">Correlation ID Length</label>
            <p class="text-sm text-surface-400">
              Length of the correlation identifier (1–63)
            </p>
          </div>
          <div class="w-48 shrink-0">
            <InputNumber
              v-model="correlationIdLength"
              :min="1"
              :max="63"
              class="w-full"
            />
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <label class="text-sm font-medium">Nonce Length</label>
            <p class="text-sm text-surface-400">
              Length of random nonce in generated URLs (1–63)
            </p>
          </div>
          <div class="w-48 shrink-0">
            <InputNumber
              v-model="correlationIdNonceLength"
              :min="1"
              :max="63"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>
