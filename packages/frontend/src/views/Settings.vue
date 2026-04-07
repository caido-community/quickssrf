<script setup lang="ts">
import Card from "primevue/card";

import { Settings as SettingsContent } from "@/components/Settings";
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
        <div class="px-4 py-3">
          <h3 class="text-lg font-semibold">Settings</h3>
          <p class="text-sm text-surface-400">
            Configure polling behavior and session defaults
          </p>
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
          <SettingsContent />
        </div>
      </template>
    </Card>
  </div>
</template>
