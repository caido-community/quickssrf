import { useClipboard } from "@vueuse/core";
import { v4 as uuidv4 } from "uuid";
import { computed, ref } from "vue";

import eventBus, { QuickSSRFBtn, QuickSSRFBtnCount } from "@/index";
import { useSDK } from "@/plugins/sdk";
import { useClientService } from "@/services/InteractshService";
import { type Response } from "@/types";

export const useLogic = () => {
  const sdk = useSDK();
  const responseEditorRef = ref();
  const requestEditorRef = ref();

  const cachedRow = ref<Response | undefined>(undefined);
  let clientService: ReturnType<typeof useClientService> | undefined =
    undefined;

  // Reactive data source
  const sourceData = ref<Response[]>([]); // The array storing the data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseDnsResponse = (json: any): Response => {
    return {
      protocol: json.protocol,
      uniqueId: json["unique-id"],
      fullId: json["full-id"],
      qType: json["q-type"],
      rawRequest: json["raw-request"].split("\n").join("\r\n"),
      rawResponse: json["raw-response"].split("\n").join("\r\n"),
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

  // Add `parseDnsResponse` data to the source
  const addToSourceData = (response: Response) => {
    QuickSSRFBtnCount.value += 1;
    QuickSSRFBtn.setCount(QuickSSRFBtnCount.value);
    sourceData.value.push(response);
  };

  // Updating table data in real time
  const tableData = computed(() =>
    sourceData.value.map((item, index) => ({
      req: index + 1,
      dateTime: new Date(item.timestamp).toISOString(),
      type: item.protocol.toUpperCase(),
      payload: item.fullId,
      source: item.remoteAddress,
    })),
  );

  // Line selection management
  const selectedRow = ref<Response | undefined>(undefined);

  const onRowClick = (event: { data: { req: number } }) => {
    QuickSSRFBtnCount.value = 0;
    QuickSSRFBtn.setCount(QuickSSRFBtnCount.value);
    const selectedIndex = event.data.req - 1;
    selectedRow.value = sourceData.value[selectedIndex];
    cachedRow.value = selectedRow.value;
    onSelectedData(selectedRow.value);
  };

  // Method called when a row is selected
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

  // Launch the service and listen for interactions
  const clipboard = useClipboard();
  const onGenerateClick = async () => {
    if (!clientService) {
      clientService = useClientService();

      await clientService.start(
        {
          serverURL: "https://oast.site",
          token: uuidv4(),
          keepAliveInterval: 30000,
        },
        (interaction: Record<string, unknown>) => {
          const resp = parseDnsResponse(interaction);
          addToSourceData(resp); // Add to the data source
        },
      );
    }
    const url = clientService?.generateUrl();
    console.log(clientService);
    if (url) {
      await clipboard.copy(url);
      sdk.window.showToast("Copied URL to clipboard.", { variant: "success" });
    }
  };

  const onManualPoll = () => {
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

  const requestEl = ref<HTMLElement | undefined>(undefined);
  const responseEl = ref<HTMLElement | undefined>(undefined);
  const initializeEditors = () => {
    const responseEditor = sdk.ui.httpResponseEditor();
    const requestEditor = sdk.ui.httpRequestEditor();

    responseEl.value?.appendChild(responseEditor.getElement());
    requestEl.value?.appendChild(requestEditor.getElement());

    responseEditorRef.value = responseEditor;
    requestEditorRef.value = requestEditor;
  };

  return {
    requestEl,
    responseEl,
    initializeEditors,
    onGenerateClick,
    onManualPoll,
    onClearData,
    onSupport,
    onRowClick,
    tableData,
    selectedRow,
  };
};
