<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputSwitch from "primevue/inputswitch";
import InputText from "primevue/inputtext";

import { onMounted, ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useUIStore } from "@/stores/uiStore";
import type { ActiveUrl } from "shared";

const sdk = useSDK();
const uiStore = useUIStore();

const visible = defineModel<boolean>("visible", { default: false });
const activeUrls = ref<ActiveUrl[]>([]);
const isLoading = ref(false);

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
    await sdk.backend.setUrlActive(url.uniqueId, !url.isActive);
    url.isActive = !url.isActive;
  } catch (error) {
    console.error("Failed to toggle URL active state:", error);
  }
}

async function removeUrl(uniqueId: string) {
  try {
    await sdk.backend.removeUrl(uniqueId);
    activeUrls.value = activeUrls.value.filter((u) => u.uniqueId !== uniqueId);
  } catch (error) {
    console.error("Failed to remove URL:", error);
  }
}

function copyUrl(url: string) {
  uiStore.copyToClipboard(url, "url");
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

// Load URLs when dialog opens
watch(visible, (newValue) => {
  if (newValue) {
    loadUrls();
  }
});

onMounted(() => {
  if (visible.value) {
    loadUrls();
  }
});
</script>

<template>
  <Dialog
    v-model:visible="visible"
    header="Manage URLs"
    modal
    :style="{ width: '700px' }"
  >
    <div class="flex flex-col gap-4">
      <p class="text-surface-400 text-sm">
        Manage your generated URLs. Disable a URL to stop receiving interactions from it.
      </p>

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
            <p class="text-surface-400 text-center">
              No URLs generated yet
            </p>
          </div>
        </template>
      </DataTable>
    </div>
  </Dialog>
</template>
