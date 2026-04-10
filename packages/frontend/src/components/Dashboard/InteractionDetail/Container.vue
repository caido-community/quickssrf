<script setup lang="ts">
import type { EditorView } from "@codemirror/view";
import type { Interaction } from "shared";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";

const props = defineProps<{
  interaction: Interaction | undefined;
}>();

const sdk = useSDK();
const requestEl = ref<HTMLElement>();
const responseEl = ref<HTMLElement>();
let requestEditorView: EditorView | undefined;
let responseEditorView: EditorView | undefined;

function setEditorContent(view: EditorView | undefined, content: string) {
  if (view === undefined) return;
  if (
    view.state.doc.length === content.length &&
    view.state.doc.toString() === content
  )
    return;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: content },
  });
}

function updateEditors(interaction: Interaction | undefined) {
  setEditorContent(requestEditorView, interaction?.rawRequest ?? "");
  setEditorContent(responseEditorView, interaction?.rawResponse ?? "");
}

onMounted(() => {
  if (requestEl.value !== undefined) {
    const editor = sdk.ui.httpRequestEditor();
    requestEl.value.appendChild(editor.getElement());
    requestEditorView = editor.getEditorView();
  }

  if (responseEl.value !== undefined) {
    const editor = sdk.ui.httpResponseEditor();
    responseEl.value.appendChild(editor.getElement());
    responseEditorView = editor.getEditorView();
  }

  updateEditors(props.interaction);
});

watch(() => props.interaction, updateEditors);

onBeforeUnmount(() => {
  requestEditorView?.destroy();
  responseEditorView?.destroy();
  requestEditorView = undefined;
  responseEditorView = undefined;
});
</script>

<template>
  <div class="flex h-full min-h-0">
    <div ref="requestEl" class="flex-1 min-w-0 border-r border-surface-700" />
    <div ref="responseEl" class="flex-1 min-w-0" />
  </div>
</template>
