<script setup lang="ts">
import Button from "primevue/button";
import type { Session } from "shared";
import { computed, ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useSessionsService } from "@/services/sessions";
import { getStatusDotColor, getStatusTextColor } from "@/utils/statusColors";

const props = defineProps<{
  session: Session;
}>();

const sdk = useSDK();
const sessionsService = useSessionsService();
const isPolling = ref(false);

const isActive = computed(
  () => props.session.status === "active" || props.session.status === "polling",
);

const onCopyUrl = () => {
  navigator.clipboard.writeText(props.session.url);
  sdk.window.showToast("URL copied to clipboard", { variant: "success" });
};

const onPoll = async () => {
  if (!isActive.value) {
    sdk.window.showToast("Session is stopped. Create a new one.", {
      variant: "warning",
    });
    return;
  }
  isPolling.value = true;
  await sessionsService.pollSession(props.session.id);
  isPolling.value = false;
};

const onStop = () => {
  sessionsService.stopSession(props.session.id);
};

const onDelete = () => {
  sessionsService.deleteSession(props.session.id);
};
</script>

<template>
  <div class="flex items-center justify-between gap-4 px-4 pt-4 pb-2">
    <div class="flex items-center gap-3 min-w-0">
      <div class="flex items-center gap-2">
        <div
          :class="[
            'w-2 h-2 rounded-full shrink-0',
            getStatusDotColor(session.status),
          ]"
        />
        <span class="text-sm font-medium truncate">{{ session.title }}</span>
      </div>

      <div
        class="flex items-center gap-1.5 px-2 py-0.5 bg-surface-800 rounded text-xs text-surface-300 font-mono truncate cursor-pointer hover:bg-surface-700"
        @click="onCopyUrl"
      >
        <i class="fas fa-link text-surface-500" />
        <span class="truncate">{{ session.url }}</span>
      </div>

      <span
        :class="[
          'text-xs uppercase tracking-wide shrink-0 font-medium',
          getStatusTextColor(session.status),
        ]"
      >
        {{ session.status }}
      </span>

      <span
        v-if="session.interactionCount > 0"
        class="text-xs text-surface-400 shrink-0"
      >
        {{ session.interactionCount }} interaction{{
          session.interactionCount !== 1 ? "s" : ""
        }}
      </span>
    </div>

    <div class="flex items-center gap-1 shrink-0">
      <Button
        v-if="isActive"
        icon="fas fa-sync"
        severity="secondary"
        text
        size="small"
        :loading="isPolling"
        @click="onPoll"
      />
      <Button
        v-if="isActive"
        icon="fas fa-stop"
        severity="warn"
        text
        size="small"
        @click="onStop"
      />
      <Button
        icon="fas fa-copy"
        severity="secondary"
        text
        size="small"
        @click="onCopyUrl"
      />
      <Button
        icon="fas fa-trash"
        severity="danger"
        text
        size="small"
        @click="onDelete"
      />
    </div>
  </div>
</template>
