<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import { useSDK } from "@/plugins/sdk";
import { ref, onMounted, computed } from "vue";
import {useClientService} from "@/services/InteractshService";
import {QuickSSRFBtn, QuickSSRFBtnCount} from "@/index";
import { v4 as uuidv4 } from "uuid";
import { useClipboard } from "@vueuse/core";


const sdk = useSDK();
const responseEditorRef = ref();
const requestEditorRef = ref();
const request = ref();
const response = ref();
const clipboard = useClipboard();
let clientService: any = null;

// Source de données réactive
const sourceData = ref<Response[]>([]); // Le tableau stockant les données

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
    }))
);

// Gestion de la sélection de ligne
const selectedRow = ref<Response | null>(null);

const onRowClick = (event: { data: { req: number } }) => {
  QuickSSRFBtnCount.value = 0;
  QuickSSRFBtn.setCount(QuickSSRFBtnCount.value);
  const selectedIndex = event.data.req - 1;
  selectedRow.value = sourceData.value[selectedIndex];
  onSelectedData(selectedRow.value);
};

// Méthode appelée lors de la sélection d’une ligne
const onSelectedData = (selectedData: Response | null) => {
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

  console.log("Selected Data:", selectedData);
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
        (interaction: any) => {
          console.log("Received interaction:", interaction);
          const resp: Response = parseDnsResponse(interaction);
          addToSourceData(resp); // Ajouter à la source de données
        }
    );
    const url = clientService.generateUrl()
    console.log(url);
    await clipboard.copy(url);
    sdk.window.showToast("Copy to clipboard.", {variant: "success"})
  }
};

const onManualPooling = async () => {
  clientService.poll();
};
const onClearData = async () => {
  sourceData.value = [];
  responseEditorRef.value.getEditorView().dispatch({
    changes: {
      from: 0,
      to: responseEditorRef.value.getEditorView().state.doc.length,
      insert: '',
    },
  });

  requestEditorRef.value.getEditorView().dispatch({
    changes: {
      from: 0,
      to: requestEditorRef.value.getEditorView().state.doc.length,
      insert: '',
    },
  });
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
    <div class="w-full flex-1">
      <Card class="h-full flex flex-col">
        <template #header>
          <div class="content-center mb-4">
            <h3 class="text-2xl">QuickSSRF</h3>
          </div>
        </template>
        <template #content>
          <div class="flex flex-col h-full">
            <!-- Actions Section -->
            <div class="flex items-center gap-4 mb-4">
              <h2 class="text-lg font-semibold">Actions</h2>
              <Button label="Generate Link" style="width: 200px" @click="onGenerateClick" />
              <Button label="Pooling" style="width: 200px" @click="onManualPooling" />
              <Button label="Clear Data" style="width: 200px" @click="onClearData" />
            </div>
            <!-- Request Logs Section -->
            <div class="flex-1 overflow-auto max-h-[300px]">
              <h3 class="text-lg font-semibold mb-2">Request Logs</h3>
              <DataTable
                  :value="tableData"
                  v-model:selection="selectedRow"
                  selectionMode="single"
                  dataKey="req"
                  scrollable
                  scrollHeight="100%"
                  class="w-full"
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
        </template>
      </Card>
    </div>

    <!-- Horizontal Split Below -->
    <div class="w-full flex flex-1 gap-4">
      <!-- Request Component -->
      <div class="h-full w-1/2" ref="request"></div>
      <!-- Response Component -->
      <div class="h-full w-1/2" ref="response"></div>
    </div>
  </div>
</template>