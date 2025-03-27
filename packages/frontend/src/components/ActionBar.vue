<script setup lang="ts">
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useLogic } from "@/composables/useLogic";
import SettingsDialog from "./SettingsDialog.vue";
import { useInteractionStore } from "@/stores/interactionStore";

const uiStore = useUIStore();
const interactionStore = useInteractionStore();
const settingsStore = useSettingsStore();
const { handleGenerateClick, handleManualPoll, handleClearData } = useLogic();
</script>

<template>
    <div class="flex justify-between items-center">
        <!-- Left side -->
        <div class="flex items-center gap-2">
            <Button
                label="Generate URL"
                :loading="uiStore.isGeneratingUrl"
                icon="fas fa-link"
                @click="handleGenerateClick"
                v-tooltip="'Generate a unique URL and copy to clipboard'"
            />
            <div class="flex items-center" v-if="uiStore.generatedUrl">
                <InputText
                    v-model="uiStore.generatedUrl"
                    placeholder="Generated URL will appear here"
                    readonly
                    class="w-[400px] rounded-r-none"
                />
                <Button
                    icon="fas fa-copy"
                    class="rounded-l-none border-l-0"
                    @click="
                        uiStore.copyToClipboard(
                            uiStore.generatedUrl,
                            'generatedUrl',
                        )
                    "
                />
            </div>
        </div>

        <!-- Right side -->
        <div class="flex items-center gap-2">
            <Button
                severity="danger"
                outlined
                icon="fas fa-sync"
                :loading="uiStore.isPolling"
                :disabled="!uiStore.generatedUrl"
                @click="handleManualPoll"
                v-tooltip="'Manually refresh to check for new interactions'"
            />
            <Button
                :disabled="interactionStore.data.length === 0"
                icon="fas fa-trash"
                @click="handleClearData"
                v-tooltip="'Clear all interaction data'"
            />
            <Button
                icon="fas fa-cog"
                @click="settingsStore.isDialogVisible = true"
                v-tooltip="'Open settings'"
            />
        </div>
    </div>

    <SettingsDialog />
</template>
