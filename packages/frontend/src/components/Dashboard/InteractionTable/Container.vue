<script setup lang="ts">
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputText from "primevue/inputtext";
import SelectButton from "primevue/selectbutton";
import type { Interaction } from "shared";
import { ref, watch } from "vue";

import { useFilters } from "./useFilters";

import { useSessionsService } from "@/services/sessions";
import { formatTimestamp, getProtocolClass } from "@/utils/statusColors";

const emit = defineEmits<{
  (e: "select", interaction: Interaction): void;
}>();

const sessionsService = useSessionsService();
const selectedRow = ref<Interaction | undefined>(undefined);

const {
  searchQuery,
  selectedProtocols,
  PROTOCOL_BUTTONS,
  filtered: interactions,
  reset: resetFilters,
  toggleSort,
  getSortIcon,
} = useFilters(() => sessionsService.interactions);

watch(
  () => sessionsService.selectedSession?.id,
  () => {
    resetFilters();
    selectedRow.value = undefined;
  },
);

const onRowSelect = (event: { data: Interaction }) => {
  selectedRow.value = event.data;
  emit("select", event.data);
};
</script>

<template>
  <div class="flex flex-col h-full">
    <div
      class="flex items-center gap-2 px-3 py-1.5 border-b border-surface-700"
    >
      <IconField class="flex-1 min-w-0">
        <InputIcon class="fas fa-magnifying-glass" />
        <InputText
          v-model="searchQuery"
          placeholder="Search interactions"
          class="w-full"
        />
      </IconField>
      <SelectButton
        v-model="selectedProtocols"
        :options="PROTOCOL_BUTTONS"
        multiple
        class="shrink-0"
      />
    </div>

    <div class="flex-1 min-h-0 overflow-auto">
      <DataTable
        v-model:selection="selectedRow"
        :value="interactions"
        selection-mode="single"
        striped-rows
        size="small"
        data-key="id"
        @row-select="onRowSelect"
      >
        <Column field="index" style="width: 3.5rem">
          <template #header>
            <span
              class="cursor-pointer flex items-center gap-1"
              @click.stop="toggleSort('index')"
            >
              #
              <i :class="getSortIcon('index')" class="text-xs" />
            </span>
          </template>
        </Column>
        <Column field="protocol" style="width: 7rem">
          <template #header>
            <span
              class="cursor-pointer flex items-center gap-1"
              @click.stop="toggleSort('protocol')"
            >
              Protocol
              <i :class="getSortIcon('protocol')" class="text-xs" />
            </span>
          </template>
          <template #body="{ data }">
            <span
              :class="[
                'font-mono text-xs uppercase font-semibold',
                getProtocolClass(data.protocol),
              ]"
            >
              {{ data.protocol }}
            </span>
          </template>
        </Column>
        <Column field="remoteAddress">
          <template #header>
            <span
              class="cursor-pointer flex items-center gap-1"
              @click.stop="toggleSort('remoteAddress')"
            >
              Source
              <i :class="getSortIcon('remoteAddress')" class="text-xs" />
            </span>
          </template>
        </Column>
        <Column field="timestamp" style="width: 7rem">
          <template #header>
            <span
              class="cursor-pointer flex items-center gap-1"
              @click.stop="toggleSort('timestamp')"
            >
              Time
              <i :class="getSortIcon('timestamp')" class="text-xs" />
            </span>
          </template>
          <template #body="{ data }">
            <span class="text-xs text-surface-400">
              {{ formatTimestamp(data.timestamp) }}
            </span>
          </template>
        </Column>
        <template #empty>
          <div class="text-center text-surface-500 py-8">
            No interactions yet. Waiting for callbacks...
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>
