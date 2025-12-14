import type { EditorView } from "@codemirror/view";
import { ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useEditorStore } from "@/stores/editorStore";
import { useInteractionStore } from "@/stores/interactionStore";
import { useUIStore } from "@/stores/uiStore";

// Get selected text from CodeMirror editor
function getEditorSelectedText(editorView: EditorView): string {
  const state = editorView.state;
  const selection = state.selection.main;
  if (selection.from === selection.to) {
    return "";
  }
  return state.sliceDoc(selection.from, selection.to);
}

export function useLogic() {
  const interactionStore = useInteractionStore();
  const editorStore = useEditorStore();
  const uiStore = useUIStore();
  const sdk = useSDK();

  const handleGenerateClick = async () => {
    uiStore.setGeneratingUrl(true);

    try {
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
    // Poll for new interactions
    await interactionStore.manualPoll();
    // Sync data and filter from backend
    await interactionStore.reloadData();
    await interactionStore.loadFilter();
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
  const contextMenuRef = ref<{ show: (event: MouseEvent) => void }>();
  const pendingCopyText = ref("");

  const initializeEditors = () => {
    const responseEditor = sdk.ui.httpResponseEditor();
    const requestEditor = sdk.ui.httpRequestEditor();

    const responseEditorEl = responseEl.value?.appendChild(
      responseEditor.getElement(),
    );
    const requestEditorEl = requestEl.value?.appendChild(
      requestEditor.getElement(),
    );

    if (responseEditorEl && requestEditorEl) {
      editorStore.setResponseEditorRef(responseEditorEl);
      editorStore.setRequestEditorRef(requestEditorEl);
    }

    // Add context menu handlers
    const handleContextMenu = (editorView: EditorView) => (event: MouseEvent) => {
      const selectedText = getEditorSelectedText(editorView);
      if (selectedText && contextMenuRef.value) {
        event.preventDefault();
        pendingCopyText.value = selectedText;
        contextMenuRef.value.show(event);
      }
    };

    const requestContextHandler = handleContextMenu(requestEditor.getEditorView());
    const responseContextHandler = handleContextMenu(responseEditor.getEditorView());

    requestEditorEl?.addEventListener("contextmenu", requestContextHandler);
    responseEditorEl?.addEventListener("contextmenu", responseContextHandler);

    if (uiStore.selectedRow) {
      editorStore.updateEditorContent(uiStore.selectedRow);
    }

    const cleanWatch = watch(
      () => uiStore.selectedRow,
      (newValue) => {
        if (newValue) {
          editorStore.updateEditorContent(newValue);
        }
      },
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

      // Remove context menu handlers
      requestEditorEl?.removeEventListener("contextmenu", requestContextHandler);
      responseEditorEl?.removeEventListener("contextmenu", responseContextHandler);

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

  const copySelectedText = () => {
    if (pendingCopyText.value) {
      navigator.clipboard.writeText(pendingCopyText.value);
      sdk.window.showToast("Copied to clipboard", { variant: "success" });
    }
  };

  return {
    requestEl,
    responseEl,
    contextMenuRef,
    pendingCopyText,

    handleGenerateClick,
    handleManualPoll,
    handleClearData,
    initializeEditors,
    copySelectedText,
  };
}
