<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import ContextMenu from "primevue/contextmenu";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";

import { ref, onMounted, onBeforeUnmount, computed, nextTick } from "vue";

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
  { label: "Red", color: "#f43f5e" },
  { label: "Orange", color: "#f97316" },
  { label: "Yellow", color: "#facc15" },
  { label: "Lime", color: "#84cc16" },
  { label: "Cyan", color: "#06b6d4" },
  { label: "Blue", color: "#3b82f6" },
  { label: "Violet", color: "#8b5cf6" },
  { label: "Pink", color: "#ec4899" },
  { label: "None", color: null },
];

function buildColorMenuItems() {
  return rowColorOptions.map((option) => ({
    label: option.label,
    icon: option.color ? "fas fa-circle" : "fas fa-ban",
    iconColor: option.color || undefined,
    command: () => {
      if (contextMenuRow.value) {
        interactionStore.setRowColor(contextMenuRow.value.uniqueId, option.color);
      }
    },
  }));
}

const contextMenuItems = ref([
  {
    label: "Set Color",
    icon: "fas fa-palette",
    items: buildColorMenuItems(),
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

// Tag editing
const editingTagId = ref<string | null>(null);
const editingTagValue = ref("");

function startEditTag(uniqueId: string, currentTag: string | undefined) {
  editingTagId.value = uniqueId;
  editingTagValue.value = currentTag || "";
}

function saveTag(uniqueId: string) {
  const newTag = editingTagValue.value.trim() || undefined;
  interactionStore.setInteractionTag(uniqueId, newTag);
  editingTagId.value = null;
  editingTagValue.value = "";
}

function cancelEditTag() {
  editingTagId.value = null;
  editingTagValue.value = "";
}

function getRowStyle(data: Interaction) {
  if (!data || !data.uniqueId) return {};

  const isSelected = uiStore.selectedRow?.uniqueId === data.uniqueId;
  const color = interactionStore.getRowColor(data.uniqueId);

  const style: Record<string, string> = {};

  if (color) {
    style.backgroundColor = `${color}20`;
    style.borderLeft = `3px solid ${color}`;
  }

  if (isSelected) {
    if (!color) {
      style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
    }
    style.outline = '2px solid #3b82f6';
    style.outlineOffset = '-2px';
  }

  return style;
}

function onRowClick(event: { originalEvent: Event; data: Interaction }) {
  // Don't select row when clicking on checkbox column
  const target = event.originalEvent.target as HTMLElement;
  if (target.closest('.p-selection-column') || target.closest('[data-p-checkbox]') || target.tagName === 'INPUT') {
    return;
  }
  uiStore.selectedRow = event.data;
}

// Get sorted data for keyboard navigation
const sortedData = computed(() => {
  return [...interactionStore.filteredTableData].sort((a, b) => b.req - a.req);
});

const dataTableRef = ref();

function scrollToSelectedRow(index: number) {
  nextTick(() => {
    const tableWrapper = dataTableRef.value?.$el?.querySelector('[data-pc-section="tablecontainer"]');
    if (!tableWrapper) return;

    const rows = tableWrapper.querySelectorAll('tbody tr[data-pc-section="bodyrow"]');
    const targetRow = rows[index] as HTMLElement;

    if (targetRow) {
      targetRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      // Move focus to the new row to sync with our selection
      targetRow.focus({ preventScroll: true });
    }
  });
}

function handleKeyDown(event: KeyboardEvent) {
  if (!uiStore.selectedRow) return;
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

  // Don't navigate if focus is in an input
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

  event.preventDefault();

  const data = sortedData.value;
  const currentIndex = data.findIndex(item => item.uniqueId === uiStore.selectedRow?.uniqueId);

  if (currentIndex === -1) return;

  let newIndex: number;
  if (event.key === 'ArrowUp') {
    newIndex = Math.max(0, currentIndex - 1);
  } else {
    newIndex = Math.min(data.length - 1, currentIndex + 1);
  }

  if (newIndex !== currentIndex && data[newIndex]) {
    uiStore.selectedRow = data[newIndex];
    scrollToSelectedRow(newIndex);
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="flex flex-col h-full">
    <DataTable
      ref="dataTableRef"
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
      sort-field="req"
      :sort-order="-1"
      @row-contextmenu="onRowContextMenu"
      @row-click="onRowClick"
    >
      <Column selection-mode="multiple" :header-checkbox-toggle-all-on-page-only="true" style="width: 40px">
        <template #header>&nbsp;</template>
      </Column>
      <Column field="req" header="Req #" sortable style="width: 80px" />
      <Column field="protocol" header="Type" sortable style="width: 100px">
        <template #body="{ data }">
          <span :class="data.protocol === 'DNS' ? 'text-orange-400' : 'text-green-500'">
            {{ data.protocol }}
          </span>
        </template>
      </Column>
      <Column
        field="httpPath"
        header="Path"
        sortable
        style="width: 250px"
        class="truncate"
      />
      <Column
        field="remoteAddress"
        header="Source"
        sortable
        style="width: 130px"
      />
      <Column field="payloadUrl" header="Payload" sortable />
      <Column field="tag" header="Tag" sortable style="width: 150px">
        <template #body="{ data }">
          <div
            v-if="editingTagId !== data.uniqueId"
            class="cursor-pointer hover:bg-surface-200 dark:hover:bg-surface-700 px-2 py-1 rounded min-h-[28px] flex items-center"
            @click.stop="startEditTag(data.uniqueId, data.tag)"
          >
            <span v-if="data.tag" class="text-primary-500">{{ data.tag }}</span>
            <span v-else class="text-surface-400 italic text-sm">Click to add</span>
          </div>
          <div v-else class="flex items-center gap-1" @click.stop>
            <InputText
              v-model="editingTagValue"
              size="small"
              class="w-full"
              placeholder="Enter tag..."
              autofocus
              @keyup.enter="saveTag(data.uniqueId)"
              @keyup.escape="cancelEditTag"
              @blur="saveTag(data.uniqueId)"
            />
          </div>
        </template>
      </Column>
      <Column
        field="localDateTime"
        header="Date-Time"
        sortable
        style="width: 180px"
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

    <ContextMenu ref="contextMenu" :model="contextMenuItems">
      <template #itemicon="{ item }">
        <i
          v-if="item.icon"
          :class="item.icon"
          :style="item.iconColor ? { color: item.iconColor } : {}"
          class="mr-2"
        />
      </template>
    </ContextMenu>
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
