<script setup lang="ts">
import Card from "primevue/card";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import type { Interaction, Session } from "shared";
import { ref, watch } from "vue";

import { InteractionDetail } from "../InteractionDetail";
import { InteractionTable } from "../InteractionTable";

import Header from "./Header.vue";

const props = defineProps<{
  session: Session;
}>();

const selectedInteraction = ref<Interaction | undefined>(undefined);

watch(
  () => props.session.id,
  () => {
    selectedInteraction.value = undefined;
  },
);

const onInteractionSelect = (interaction: Interaction) => {
  selectedInteraction.value = interaction;
};
</script>

<template>
  <Card
    class="h-full"
    :pt="{
      root: {
        style: 'display: flex; flex-direction: column; height: 100%;',
      },
      body: { class: 'flex-1 p-0 flex flex-col min-h-0' },
      content: { class: 'flex-1 flex flex-col min-h-0' },
    }"
  >
    <template #content>
      <Header :session="session" />

      <div class="flex-1 min-h-0">
        <template v-if="selectedInteraction !== undefined">
          <Splitter layout="vertical" class="h-full !border-0">
            <SplitterPanel
              :size="50"
              :min-size="20"
              class="overflow-hidden bg-surface-800"
            >
              <InteractionTable class="h-full" @select="onInteractionSelect" />
            </SplitterPanel>
            <SplitterPanel
              :size="50"
              :min-size="20"
              class="overflow-hidden bg-surface-900"
            >
              <InteractionDetail :interaction="selectedInteraction" />
            </SplitterPanel>
          </Splitter>
        </template>
        <template v-else>
          <InteractionTable class="h-full" @select="onInteractionSelect" />
        </template>
      </div>
    </template>
  </Card>
</template>
