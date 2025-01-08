<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { onMounted } from "vue";

import { useLogic } from "./useLogic";

const {
  requestEl,
  responseEl,
  onGenerateClick,
  onManualPoll,
  onClearData,
  onSupport,
  onRowClick,
  tableData,
  selectedRow,
  initializeEditors,
} = useLogic();

onMounted(() => {
  initializeEditors();
});
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <!-- Top Pane -->
    <div
      id="ici"
      class="w-full flex-1 min-h-0 rounded-[0.25rem] shadow-md bg-surface-0 dark:bg-surface-800 text-surface-700 dark:text-surface-0"
    >
      <div class="h-full flex flex-col">
        <!-- Header Section -->
        <div class="content-center mb-4">
          <h3 class="text-2xl ml-1">QuickSSRF</h3>
        </div>

        <!-- Content Section -->
        <div class="flex flex-col h-full min-h-0">
          <!-- Actions Section -->
          <div class="flex-none flex items-center justify-between mb-4 m-4">
            <!-- Left-aligned Buttons -->
            <div class="flex gap-4 m-4">
              <Button
                label="Generate Link"
                style="width: 200px"
                @click="onGenerateClick"
              />
              <Button label="Poll" style="width: 200px" @click="onManualPoll" />
              <Button
                label="Clear Data"
                style="width: 200px"
                @click="onClearData"
              />
            </div>
            <!-- Right-aligned Button -->
            <button
              id="star-project"
              class="p-button p-button-rounded"
              @click="onSupport"
            >
              ⭐ STAR ON GITHUB
            </button>
          </div>
          <!-- Request Logs Section -->
          <div class="flex-1 min-h-5">
            <h3 class="text-lg mb-2">Request Logs</h3>
            <!-- DataTable directly scrollable -->
            <DataTable
              v-model:selection="selectedRow"
              :value="tableData"
              selection-mode="single"
              data-key="req"
              scrollable
              scroll-height="90%"
              class="w-full h-full"
              @row-click="onRowClick"
            >
              <Column field="req" header="Req #" sortable />
              <Column field="dateTime" header="Date-Time" sortable />
              <Column field="type" header="Type" sortable />
              <Column field="payload" header="Payload" sortable />
              <Column field="source" header="Source" sortable />
            </DataTable>
          </div>
        </div>
      </div>
    </div>

    <!-- Horizontal Split Below -->
    <div class="w-full flex flex-1 gap-4 overflow-hidden">
      <!-- Request Component -->
      <div ref="requestEl" class="h-full w-1/2"></div>
      <!-- Response Component -->
      <div ref="responseEl" class="h-full w-1/2"></div>
    </div>
  </div>
</template>
