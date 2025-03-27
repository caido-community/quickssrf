<script setup lang="ts">
import Button from "primevue/button";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tooltip from "primevue/tooltip";
import { onMounted, toRef } from "vue";

import ActionBar from "@/components/ActionBar.vue";
import PayloadTable from "@/components/PayloadTable.vue";
import { useLogic } from "@/composables/useLogic";
import { useUIStore } from "@/stores/uiStore";

const vTooltip = Tooltip;
const { requestEl, responseEl, initializeEditors } = useLogic();

const uiStore = useUIStore();
const selectedRow = toRef(uiStore, "selectedRow");

onMounted(() => {
    initializeEditors();
});
</script>
<template>
    <Splitter class="h-full" layout="vertical">
        <!-- Top: controls & table -->
        <SplitterPanel class="flex-1 min-h-0" :min-size="30">
            <div
                class="h-full rounded-md shadow-md bg-surface-0 dark:bg-surface-800 text-surface-700 dark:text-surface-0 flex flex-col"
            >
                <!-- Header -->
                <header
                    class="p-4 flex justify-between items-center border-b border-surface-200 dark:border-surface-700"
                >
                    <h1 class="text-2xl font-semibold">QuickSSRF</h1>
                    <Button
                        label="Star on GitHub"
                        icon="fas fa-star"
                        class="font-medium"
                        v-tooltip="'Support the project on GitHub'"
                    />
                </header>

                <!-- Controls -->
                <div class="p-4">
                    <ActionBar />
                </div>

                <!-- Table -->
                <div class="flex-1 min-h-0 overflow-auto">
                    <PayloadTable />
                </div>
            </div>
        </SplitterPanel>

        <!-- Bottom: editors -->
        <SplitterPanel class="flex-1" :min-size="30">
            <!-- Empty state card -->
            <div
                class="h-full w-full flex flex-col justify-center items-center bg-surface-0 dark:bg-surface-800 text-surface-700 dark:text-surface-0 rounded-md shadow-md"
                :style="{ display: selectedRow ? 'none' : 'flex' }"
            >
                <i class="fas fa-code text-surface-300 text-4xl mb-3"></i>
                <p class="text-surface-400 text-center">
                    Select an interaction to view request and response details
                </p>
            </div>

            <!-- Editors -->
            <Splitter
                class="h-full"
                :style="{ display: selectedRow ? 'flex' : 'none' }"
            >
                <SplitterPanel class="min-h-0" :min-size="30">
                    <div ref="requestEl" class="h-full"></div>
                </SplitterPanel>
                <SplitterPanel class="min-h-0" :min-size="30">
                    <div ref="responseEl" class="h-full"></div>
                </SplitterPanel>
            </Splitter>
        </SplitterPanel>
    </Splitter>
</template>
