import { defineStore } from "pinia";
import { ref } from "vue";
import type { Interaction } from "@/types";

export const useEditorStore = defineStore("editors", () => {
  const responseEditorRef = ref();
  const requestEditorRef = ref();

  const event = new CustomEvent("refreshEditors");
  const eventBus = new EventTarget();

  function updateEditorContent(interaction: Interaction) {
    if (!responseEditorRef.value || !requestEditorRef.value) return;

    responseEditorRef.value.getEditorView().dispatch({
      changes: {
        from: 0,
        to: responseEditorRef.value.getEditorView().state.doc.length,
        insert: interaction.rawResponse,
      },
    });

    requestEditorRef.value.getEditorView().dispatch({
      changes: {
        from: 0,
        to: requestEditorRef.value.getEditorView().state.doc.length,
        insert: interaction.rawRequest,
      },
    });
  }

  function clearEditors() {
    if (!responseEditorRef.value || !requestEditorRef.value) return;

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
  }

  function setRequestEditorRef(ref: HTMLElement) {
    requestEditorRef.value = ref;
  }

  function setResponseEditorRef(ref: HTMLElement) {
    responseEditorRef.value = ref;
  }

  function refreshEditors() {
    eventBus.dispatchEvent(event);
  }

  return {
    eventBus,
    responseEditorRef,
    requestEditorRef,

    updateEditorContent,
    clearEditors,
    setRequestEditorRef,
    setResponseEditorRef,
    refreshEditors,
  };
});
