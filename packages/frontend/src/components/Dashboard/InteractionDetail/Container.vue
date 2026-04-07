<script setup lang="ts">
import type { EditorView } from "@codemirror/view";
import type { Interaction } from "shared";
import { onMounted, ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";

const props = defineProps<{
  interaction: Interaction | undefined;
}>();

const sdk = useSDK();
const requestEl = ref<HTMLElement>();
const responseEl = ref<HTMLElement>();
let requestEditorView: EditorView | undefined;
let responseEditorView: EditorView | undefined;

function updateEditors(interaction: Interaction | undefined) {
  if (requestEditorView !== undefined) {
    const content = interaction?.rawRequest ?? "";
    requestEditorView.dispatch({
      changes: {
        from: 0,
        to: requestEditorView.state.doc.length,
        insert: content,
      },
    });
  }
  if (responseEditorView !== undefined) {
    const content = interaction?.rawResponse ?? "";
    responseEditorView.dispatch({
      changes: {
        from: 0,
        to: responseEditorView.state.doc.length,
        insert: content,
      },
    });
  }
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
</script>

<template>
  <div class="flex h-full min-h-0">
    <div ref="requestEl" class="flex-1 min-w-0 border-r border-surface-700" />
    <div ref="responseEl" class="flex-1 min-w-0" />
  </div>
</template>
