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
  <div class="h-full flex flex-col gap-2">
    <!-- Top Pane -->
    <div
      class="w-full flex-1 min-h-0 rounded-[0.25rem] shadow-md bg-surface-0 dark:bg-surface-800 text-surface-700 dark:text-surface-0"
    >
      <div class="h-full flex flex-col">
        <!-- Header Section -->
        <div class="content-center p-4 flex items-center justify-between">
          <h3 class="text-xl">QuickSSRF</h3>
        </div>

        <!-- Content Section -->
        <div class="flex flex-col h-full min-h-0">
          <!-- Request Logs Section -->
          <div class="flex-1 min-h-0 overflow-auto">
            <div class="flex items-center justify-between p-4 pt-0">
              <!-- Actions Section -->
              <div class="flex-1 flex items-center justify-between">
                <!-- Left-aligned Buttons -->
                <div class="flex gap-2">
                  <Button label="Generate URL" style="width: 200px" @click="onGenerateClick" />
                  <Button severity="contrast" style="width: 200px" label="Refresh" icon="fas fa-sync" @click="onManualPoll" />
                  <Button severity="contrast" style="width: 200px" label="Clear" @click="onClearData" />
                </div>

                <!-- Right-aligned Button -->
                <Button
                  label="STAR ON GITHUB"
                  severity="contrast"
                  icon="fas fa-star"
                  @click="onSupport"
                  iconClass="text-yellow-400"
                  style="width: 200px"
                />
              </div>
            </div>
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

              <template #empty>
                <div class="flex flex-col justify-center items-center gap-2">
                  <h3 class="text-surface-300 text-xl">Request Logs</h3>
                  <p class="text-surface-300">No data found</p>
                </div>
              </template>
            </DataTable>
          </div>
        </div>
      </div>
    </div>

    <!-- Horizontal Split Below -->
    <div class="w-full flex flex-1 gap-2 overflow-hidden">
      <!-- Request Component -->
      <div ref="requestEl" class="h-full w-1/2"></div>
      <!-- Response Component -->
      <div ref="responseEl" class="h-full w-1/2"></div>
    </div>
  </div>
</template>
