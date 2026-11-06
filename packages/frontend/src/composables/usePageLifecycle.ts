import { readonly, ref } from "vue";

// Caido detaches the plugin page when navigating away. Native HTTP editors
// created before that stop rendering after re-entering, so components holding
// editors key on this counter to rebuild them on every page enter.
const pageEnterCount = ref(0);

export function usePageLifecycle() {
  const notifyPageEnter = () => {
    pageEnterCount.value++;
  };

  return { pageEnterCount: readonly(pageEnterCount), notifyPageEnter };
}
