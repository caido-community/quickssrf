<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
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
  <Splitter class="h-full" layout="vertical">
    <SplitterPanel class="flex-1 min-h-0">
      <div
        class="h-full rounded-[0.25rem] shadow-md bg-surface-0 dark:bg-surface-800 text-surface-700 dark:text-surface-0"
      >
        <div class="h-full flex flex-col">
          <!-- Header Section -->
          <div class="content-center p-4 flex items-center justify-between">
            <h3 class="text-xl">QuickSSRF</h3>
          </div>

          <!-- Content Section -->
          <div class="flex flex-col h-full min-h-0">
            <div class="flex items-center justify-between p-4 pt-0">
              <!-- Actions Section -->
              <div class="flex-1 flex items-center justify-between">
                <!-- Left-aligned Buttons -->
                <div class="flex gap-2">
                  <Button
                    label="Generate URL"
                    style="width: 200px"
                    @click="onGenerateClick"
                  />
                  <Button
                    severity="contrast"
                    style="width: 200px"
                    label="Refresh"
                    icon="fas fa-sync"
                    @click="onManualPoll"
                  />
                  <Button
                    severity="contrast"
                    style="width: 200px"
                    label="Clear"
                    @click="onClearData"
                  />
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

            <!-- Request Logs Section -->
            <div class="flex-1 min-h-0 overflow-auto">
              <!-- DataTable directly scrollable -->
              <DataTable
                v-model:selection="selectedRow"
                :value="tableData"
                selection-mode="single"
                data-key="req"
                scrollable
                scroll-height="100%"
                class="w-full h-full"
                @row-click="onRowClick"
                stripedRows
              >
                <Column field="req" header="Req #" sortable />
                <Column field="dateTime" header="Date-Time" sortable />
                <Column field="type" header="Type" sortable />
                <Column field="payload" header="Payload" sortable />
                <Column field="source" header="Source" sortable />

                <template #empty>
                  <div
                    class="flex flex-col justify-center items-center h-full w-full"
                  >
                    <p class="text-surface-300 text-center">No data found</p>
                  </div>
                </template>
              </DataTable>
            </div>
          </div>
        </div>
      </div>
    </SplitterPanel>

    <SplitterPanel class="flex-1">
      <Splitter class="h-full">
        <SplitterPanel class="min-h-0">
          <div ref="requestEl" class="h-full"></div>
        </SplitterPanel>
        <SplitterPanel class="min-h-0">
          <div ref="responseEl" class="h-full"></div>
        </SplitterPanel>
      </Splitter>
    </SplitterPanel>
  </Splitter>
</template>
