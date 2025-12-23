<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputSwitch from "primevue/inputswitch";
import InputText from "primevue/inputtext";
import type { ActiveUrl } from "shared";
import { onMounted, onUnmounted, ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useUIStore } from "@/stores/uiStore";

const sdk = useSDK();
const uiStore = useUIStore();

const visible = defineModel<boolean>("visible", { default: false });
const activeUrls = ref<ActiveUrl[]>([]);
const isLoading = ref(false);

// Skip flag to avoid reloading when we made the change ourselves
let skipNextUrlsChangeEvent = false;
let urlsChangedSubscription: { stop: () => void } | undefined;

async function loadUrls() {
  isLoading.value = true;
  try {
    activeUrls.value = await sdk.backend.getActiveUrls();
  } catch (error) {
    console.error("Failed to load active URLs:", error);
  } finally {
    isLoading.value = false;
  }
}

async function toggleUrlActive(url: ActiveUrl) {
  try {
    skipNextUrlsChangeEvent = true;
    await sdk.backend.setUrlActive(url.uniqueId, !url.isActive);
    url.isActive = !url.isActive;
  } catch (error) {
    skipNextUrlsChangeEvent = false;
    console.error("Failed to toggle URL active state:", error);
  }
}

async function removeUrl(uniqueId: string) {
  try {
    skipNextUrlsChangeEvent = true;
    await sdk.backend.removeUrl(uniqueId);
    activeUrls.value = activeUrls.value.filter((u) => u.uniqueId !== uniqueId);
  } catch (error) {
    skipNextUrlsChangeEvent = false;
    console.error("Failed to remove URL:", error);
  }
}

async function clearAllUrls() {
  try {
    skipNextUrlsChangeEvent = true;
    await sdk.backend.clearUrls();
    activeUrls.value = [];
  } catch (error) {
    skipNextUrlsChangeEvent = false;
    console.error("Failed to clear URLs:", error);
  }
}

function copyUrl(url: string) {
  uiStore.copyToClipboard(url, "url");
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

// Subscribe to URL changes from other tabs
function subscribeToUrlsChanged() {
  urlsChangedSubscription = sdk.backend.onEvent("onUrlsChanged", () => {
    if (skipNextUrlsChangeEvent) {
      skipNextUrlsChangeEvent = false;
      return;
    }
    // Only reload if dialog is visible
    if (visible.value) {
      loadUrls();
    }
  });
}

// Load URLs when dialog opens
watch(visible, (newValue) => {
  if (newValue) {
    loadUrls();
  }
});

onMounted(() => {
  subscribeToUrlsChanged();
  if (visible.value) {
    loadUrls();
  }
});

onUnmounted(() => {
  urlsChangedSubscription?.stop();
});
</script>

<template>
  <Dialog
    v-model:visible="visible"
    header="Manage URLs"
    modal
    :style="{ width: '850px' }"
  >
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <p class="text-surface-400 text-sm">
          Manage your generated URLs. Disable a URL to stop receiving
          interactions from it.
        </p>
        <Button
          label="Clear All"
          icon="fas fa-trash"
          severity="danger"
          size="small"
          :disabled="activeUrls.length === 0"
          @click="clearAllUrls"
        />
      </div>

      <DataTable
        :value="activeUrls"
        :loading="isLoading"
        size="small"
        scrollable
        scroll-height="300px"
        striped-rows
      >
        <Column header="Active" style="width: 80px">
          <template #body="{ data }">
            <InputSwitch
              :model-value="data.isActive"
              @update:model-value="toggleUrlActive(data)"
            />
          </template>
        </Column>
        <Column header="URL" field="url">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <InputText
                :model-value="data.url"
                readonly
                class="flex-1 text-sm"
                :class="{ 'opacity-50': !data.isActive }"
              />
              <Button
                icon="fas fa-copy"
                severity="secondary"
                text
                size="small"
                @click="copyUrl(data.url)"
              />
            </div>
          </template>
        </Column>
        <Column header="Server" style="width: 120px">
          <template #body="{ data }">
            <span class="text-sm text-surface-400">
              {{ data.serverUrl?.replace("https://", "") || "N/A" }}
            </span>
          </template>
        </Column>
        <Column header="Created" style="width: 160px">
          <template #body="{ data }">
            <span class="text-sm text-surface-400">
              {{ formatDate(data.createdAt) }}
            </span>
          </template>
        </Column>
        <Column header="" style="width: 50px">
          <template #body="{ data }">
            <Button
              icon="fas fa-trash"
              severity="danger"
              text
              size="small"
              @click="removeUrl(data.uniqueId)"
            />
          </template>
        </Column>

        <template #empty>
          <div class="flex flex-col justify-center items-center py-8">
            <i class="fas fa-link text-surface-300 text-3xl mb-3"></i>
            <p class="text-surface-400 text-center">No URLs generated yet</p>
          </div>
        </template>
      </DataTable>
    </div>
  </Dialog>
</template>
