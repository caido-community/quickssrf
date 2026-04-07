import { ref } from "vue";

export function useSelectionState() {
  const selectedSessionId = ref<string | undefined>(undefined);

  const getState = () => selectedSessionId.value;
  const select = (id: string | undefined) => {
    selectedSessionId.value = id;
  };
  const reset = () => {
    selectedSessionId.value = undefined;
  };

  return {
    selectionState: { getState, select, reset },
  };
}
