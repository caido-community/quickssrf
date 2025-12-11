<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import ContextMenu from "primevue/contextmenu";
import DataTable from "primevue/datatable";

import { ref } from "vue";

import { useLogic } from "@/composables/useLogic";
import { useEditorStore } from "@/stores/editorStore";
import { useInteractionStore } from "@/stores/interactionStore";
import { useUIStore } from "@/stores/uiStore";
import type { Interaction } from "@/types";

const uiStore = useUIStore();
const interactionStore = useInteractionStore();
const editorStore = useEditorStore();
const { handleGenerateClick, handleManualPoll } = useLogic();

const contextMenu = ref();
const contextMenuRow = ref<Interaction | null>(null);

const rowColorOptions = [
  { label: "Red", color: "#ef4444" },
  { label: "Orange", color: "#f97316" },
  { label: "Yellow", color: "#eab308" },
  { label: "Green", color: "#22c55e" },
  { label: "Blue", color: "#3b82f6" },
  { label: "Purple", color: "#a855f7" },
  { label: "Pink", color: "#ec4899" },
  { label: "None", color: null },
];

const contextMenuItems = ref([
  {
    label: "Set Color",
    icon: "fas fa-palette",
    items: rowColorOptions.map((option) => ({
      label: option.label,
      icon: option.color ? "fas fa-circle" : "fas fa-ban",
      style: option.color ? { color: option.color } : {},
      command: () => {
        if (contextMenuRow.value) {
          interactionStore.setRowColor(contextMenuRow.value.uniqueId, option.color);
        }
      },
    })),
  },
  {
    separator: true,
  },
  {
    label: "Delete",
    icon: "fas fa-trash",
    command: () => {
      if (contextMenuRow.value) {
        interactionStore.deleteInteraction(contextMenuRow.value.uniqueId);
        if (uiStore.selectedRow?.uniqueId === contextMenuRow.value.uniqueId) {
          editorStore.clearEditors();
          uiStore.selectedRow = undefined;
        }
        contextMenuRow.value = null;
      }
    },
  },
]);

function onRowContextMenu(event: { originalEvent: Event; data: Interaction }) {
  contextMenuRow.value = event.data;
  uiStore.setSelectedRow(event.data);
  contextMenu.value.show(event.originalEvent);
}

function deleteRow(uniqueId: string) {
  interactionStore.deleteInteraction(uniqueId);
  if (uiStore.selectedRow?.uniqueId === uniqueId) {
    editorStore.clearEditors();
    uiStore.selectedRow = undefined;
  }
}

function getRowStyle(data: Interaction) {
  if (!data || !data.uniqueId) return {};
  const color = interactionStore.getRowColor(data.uniqueId);
  if (color) {
    return { backgroundColor: `${color}20`, borderLeft: `3px solid ${color}` };
  }
  return {};
}

function onRowClick(event: { originalEvent: MouseEvent; data: Interaction }) {
  // Don't select row when clicking on checkbox column
  const target = event.originalEvent.target as HTMLElement;
  if (target.closest('.p-selection-column') || target.closest('[data-p-checkbox]') || target.tagName === 'INPUT') {
    return;
  }
  uiStore.selectedRow = event.data;
}
</script>

<template>
  <div class="flex flex-col h-full">
    <DataTable
      v-model:selection="interactionStore.selectedRows"
      :value="interactionStore.filteredTableData"
      data-key="uniqueId"
      scrollable
      scroll-height="flex"
      size="small"
      class="w-full flex-1"
      striped-rows
      :row-style="getRowStyle"
      :meta-key-selection="false"
      @row-contextmenu="onRowContextMenu"
      @row-click="onRowClick"
    >
      <Column selection-mode="multiple" :header-checkbox-toggle-all-on-page-only="true" style="width: 40px">
        <template #header>&nbsp;</template>
      </Column>
      <Column field="req" header="Req #" sortable style="width: 80px" />
      <Column field="protocol" header="Type" sortable style="width: 100px" />
      <Column
        field="httpPath"
        header="Path"
        sortable
        style="width: 250px"
        class="truncate"
      />
      <Column
        field="dateTime"
        header="Date-Time"
        sortable
        style="width: 220px"
      />
      <Column field="fullId" header="Payload" sortable />
      <Column
        field="remoteAddress"
        header="Source"
        sortable
        style="width: 120px"
      />
      <Column header="" style="width: 50px">
        <template #body="{ data }">
          <Button
            icon="fas fa-trash"
            severity="danger"
            text
            size="small"
            @click.stop="deleteRow(data.uniqueId)"
          />
        </template>
      </Column>

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

    <ContextMenu ref="contextMenu" :model="contextMenuItems" />
  </div>
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
