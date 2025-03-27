<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";

import { useLogic } from "@/composables/useLogic";
import { useInteractionStore } from "@/stores/interactionStore";
import { useUIStore } from "@/stores/uiStore";

const uiStore = useUIStore();
const interactionStore = useInteractionStore();
const { handleGenerateClick, handleManualPoll } = useLogic();
</script>

<template>
  <DataTable
    v-model:selection="uiStore.selectedRow"
    :value="interactionStore.tableData"
    selection-mode="single"
    data-key="req"
    scrollable
    scroll-height="100%"
    size="small"
    class="w-full"
    striped-rows
  >
    <Column field="req" header="Req #" sortable style="width: 80px" />
    <Column field="protocol" header="Type" sortable style="width: 100px" />
    <Column
      field="httpPath"
      header="Path"
      sortable
      style="width: 250px"
      class="truncate"
    />
    <Column field="dateTime" header="Date-Time" sortable style="width: 220px" />
    <Column field="fullId" header="Payload" sortable />
    <Column
      field="remoteAddress"
      header="Source"
      sortable
      style="width: 120px"
    />

    <template #empty>
      <div class="flex flex-col justify-center items-center h-64 w-full">
        <i class="fas fa-server text-surface-300 text-4xl mb-3"></i>
        <p
          class="text-surface-400 text-center mb-4"
          :class="{ shimmer: uiStore.generatedUrl || uiStore.isGeneratingUrl }"
        >
          <span v-if="!uiStore.generatedUrl && !uiStore.isGeneratingUrl">
            Generate a URL to start capturing interactions
          </span>
          <span v-else-if="uiStore.isGeneratingUrl"> Generating URL... </span>
          <span v-else> Waiting for interactions... </span>
        </p>
        <Button
          v-if="!uiStore.generatedUrl"
          label="Generate URL"
          icon="fas fa-link"
          size="small"
          :loading="uiStore.isGeneratingUrl"
          @click="handleGenerateClick"
        />
        <Button
          v-else
          label="Refresh"
          icon="fas fa-sync"
          size="small"
          :loading="uiStore.isPolling"
          @click="handleManualPoll"
        />
      </div>
    </template>
  </DataTable>
</template>

<style scoped>
.shimmer {
  display: inline-block;
  color: white;
  background: #acacac linear-gradient(to left, #acacac, #ffffff 50%, #acacac);
  background-position: -4rem top;
  background-repeat: no-repeat;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-animation: shimmer 2.2s infinite;
  animation: shimmer 2.2s infinite;
  background-size: 4rem 100%;
}

@-webkit-keyframes shimmer {
  0% {
    background-position: -4rem top;
  }
  70% {
    background-position: 12.5rem top;
  }
  100% {
    background-position: 12.5rem top;
  }
}

@keyframes shimmer {
  0% {
    background-position: -4rem top;
  }
  70% {
    background-position: 12.5rem top;
  }
  100% {
    background-position: 12.5rem top;
  }
}
</style>
