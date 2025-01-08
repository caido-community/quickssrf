<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { v4 as uuidv4 } from "uuid";
import { computed, onMounted, ref } from "vue";

import eventBus, { QuickSSRFBtn, QuickSSRFBtnCount } from "@/index";
import { useSDK } from "@/plugins/sdk";
import { Response } from "@/types";
import { useClientService } from "@/services/InteractshService";

const sdk = useSDK();
const responseEditorRef = ref();
const requestEditorRef = ref();
const request = ref();
const response = ref();
const clipboard = useClipboard();
const cachedRow = ref<Response | undefined>(undefined);
let clientService: ReturnType<typeof useClientService> | undefined = undefined;
// Source de données réactive
const sourceData = ref<Response[]>([]); // Le tableau stockant les données

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseDnsResponse = (json: any): Response => {
  return {
    protocol: json.protocol,
    uniqueId: json["unique-id"],
    fullId: json["full-id"],
    qType: json["q-type"],
    rawRequest: json["raw-request"],
    rawResponse: json["raw-response"],
    remoteAddress: json["remote-address"],
    timestamp: json.timestamp,
  };
};

function waitForEditorRef() {
  return new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (requestEditorRef.value && responseEditorRef.value) {
        clearInterval(interval); // Stop checking
        resolve(); // Continue execution
      }
    }, 100); // Check every 100ms
  });
}

function handleUpdateSelected() {
  waitForEditorRef().then(() => {
    if (cachedRow.value) {
      onSelectedData(cachedRow.value); // Trigger with cached data
    }
  });
}
eventBus.addEventListener("updateSelected", handleUpdateSelected);

// Ajouter les données de `parseDnsResponse` à la source
const addToSourceData = (response: Response) => {
  QuickSSRFBtnCount.value += 1;
  QuickSSRFBtn.setCount(QuickSSRFBtnCount.value);
  sourceData.value.push(response);
};

// Mise à jour des données du tableau en temps réel
const tableData = computed(() =>
  sourceData.value.map((item, index) => ({
    req: index + 1,
    dateTime: new Date(item.timestamp).toISOString(),
    type: item.protocol.toUpperCase(),
    payload: item.fullId,
    source: item.remoteAddress,
  })),
);

// Gestion de la sélection de ligne
const selectedRow = ref<Response | undefined>(undefined);

const onRowClick = (event: { data: { req: number } }) => {
  QuickSSRFBtnCount.value = 0;
  QuickSSRFBtn.setCount(QuickSSRFBtnCount.value);
  const selectedIndex = event.data.req - 1;
  selectedRow.value = sourceData.value[selectedIndex];
  cachedRow.value = selectedRow.value;
  onSelectedData(selectedRow.value);
};

// Méthode appelée lors de la sélection d’une ligne
const onSelectedData = (selectedData: Response | undefined) => {
  responseEditorRef.value.getEditorView().dispatch({
    changes: {
      from: 0,
      to: responseEditorRef.value.getEditorView().state.doc.length,
      insert: selectedData?.rawResponse,
    },
  });

  requestEditorRef.value.getEditorView().dispatch({
    changes: {
      from: 0,
      to: requestEditorRef.value.getEditorView().state.doc.length,
      insert: selectedData?.rawRequest,
    },
  });
};

// Lancer le service et écouter les interactions
const onGenerateClick = async () => {
  if (clientService === null) {
    clientService = useClientService();

    await clientService.start(
      {
        serverURL: "https://oast.site",
        token: uuidv4(),
        keepAliveInterval: 30000,
      },
      (interaction: Record<string, unknown>) => {
        const resp = parseDnsResponse(interaction);
        addToSourceData(resp); // Ajouter à la source de données
      },
    );
  }
  const url = clientService?.generateUrl();
  if (url) {
    await clipboard.copy(url);
    sdk.window.showToast("Copy to clipboard.", { variant: "success" });
  }
};

const onManualPooling = () => {
  clientService?.poll();
};
const onClearData = () => {
  sourceData.value = [];
  cachedRow.value = undefined;
  responseEditorRef.value.getEditorView().dispatch({
    changes: {
      from: 0,
      to: responseEditorRef.value.getEditorView().state.doc.length,
      insert: "",
    },
  });

  requestEditorRef.value.getEditorView().dispatch({
    changes: {
      from: 0,
      to: requestEditorRef.value.getEditorView().state.doc.length,
      insert: "",
    },
  });
  if (QuickSSRFBtnCount.value > 0) {
    QuickSSRFBtnCount.value = 0;
    QuickSSRFBtn.setCount(QuickSSRFBtnCount.value);
  }
};

const onSupport = () => {
  window.open("https://github.com/caido-community/quickssrf", "_blank");
};

onMounted(() => {
  const responseEditor = sdk.ui.httpResponseEditor();
  const requestEditor = sdk.ui.httpRequestEditor();

  response.value.appendChild(responseEditor.getElement());
  request.value.appendChild(requestEditor.getElement());

  responseEditorRef.value = responseEditor;
  requestEditorRef.value = requestEditor;
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
              <Button
                label="Pooling"
                style="width: 200px"
                @click="onManualPooling"
              />
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
      <div ref="request" class="h-full w-1/2"></div>
      <!-- Response Component -->
      <div ref="response" class="h-full w-1/2"></div>
    </div>
  </div>
</template>
