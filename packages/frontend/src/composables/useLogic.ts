import { ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useEditorStore } from "@/stores/editorStore";
import { useInteractionStore } from "@/stores/interactionStore";
import { useUIStore } from "@/stores/uiStore";

export function useLogic() {
  const interactionStore = useInteractionStore();
  const editorStore = useEditorStore();
  const uiStore = useUIStore();
  const sdk = useSDK();

  const handleGenerateClick = async () => {
    uiStore.setGeneratingUrl(true);

    try {
      handleClearData();
      const url = await interactionStore.generateUrl();

      if (!url) {
        sdk.window.showToast("Failed to generate URL.", { variant: "error" });
        return null;
      }

      uiStore.setGeneratedUrl(url);
      return url;
    } finally {
      uiStore.setGeneratingUrl(false);
    }
  };

  const handleManualPoll = async () => {
    uiStore.setPolling(true);
    await interactionStore.manualPoll();
    uiStore.setPolling(false);
  };

  const handleClearData = () => {
    interactionStore.clearData();
    editorStore.clearEditors();
    uiStore.setSelectedRow(undefined);
  };

  function waitForEditorRef() {
    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (editorStore.requestEditorRef && editorStore.responseEditorRef) {
          clearInterval(interval);
          resolve();
        }
      }, 25);
    });
  }

  const requestEl = ref<HTMLElement | undefined>(undefined);
  const responseEl = ref<HTMLElement | undefined>(undefined);
  const initializeEditors = () => {
    const responseEditor = sdk.ui.httpResponseEditor();
    const requestEditor = sdk.ui.httpRequestEditor();

    const responseEditorEl = responseEl.value?.appendChild(
      responseEditor.getElement()
    );
    const requestEditorEl = requestEl.value?.appendChild(
      requestEditor.getElement()
    );

    if (responseEditorEl && requestEditorEl) {
      editorStore.setResponseEditorRef(responseEditorEl);
      editorStore.setRequestEditorRef(requestEditorEl);
    }

    if (uiStore.selectedRow) {
      editorStore.updateEditorContent(uiStore.selectedRow);
    }

    const cleanWatch = watch(
      () => uiStore.selectedRow,
      (newValue) => {
        if (newValue) {
          editorStore.updateEditorContent(newValue);
        }
      }
    );

    const eventHandler = () => {
      waitForEditorRef().then(() => {
        cleanup();
        initializeEditors();
      });
    };

    const cleanup = () => {
      cleanWatch();

      editorStore.eventBus.removeEventListener("refreshEditors", eventHandler);

      if (responseEditorEl) {
        responseEditorEl.remove();
      }

      if (requestEditorEl) {
        requestEditorEl.remove();
      }

      editorStore.requestEditorRef.value = undefined;
      editorStore.responseEditorRef.value = undefined;
    };

    editorStore.eventBus.addEventListener("refreshEditors", eventHandler);
  };

  return {
    requestEl,
    responseEl,

    handleGenerateClick,
    handleManualPoll,
    handleClearData,
    initializeEditors,
  };
}
