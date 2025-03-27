import { Classic } from "@caido/primevue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import { createApp } from "vue";

import { SDKPlugin } from "./plugins/sdk";
import "./styles/index.css";
import type { FrontendSDK } from "./types";
import App from "./views/App.vue";

import { useEditorStore } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";

const eventBus = new EventTarget();
export default eventBus;

// This is the entry point for the frontend plugin
export let sidebarItem: ReturnType<FrontendSDK["sidebar"]["registerItem"]>;
export const init = (sdk: FrontendSDK) => {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  // Load the PrimeVue component library
  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });

  // Provide the FrontendSDK
  app.use(SDKPlugin, sdk);

  // Create the root element for the app
  const root = document.createElement("div");
  Object.assign(root.style, {
    height: "100%",
    width: "100%",
  });

  /*
   * Set the ID of the root element
   * We use the manifest ID to ensure that the ID is unique per-plugin
   * This is necessary to prevent styling conflicts between plugins
   * The value here should be the same as the prefixWrap plugin in postcss.config.js
   */
  root.id = "plugin--quickssrf";

  // Mount the app to the root element
  app.mount(root);

  /*
   * Add the page to the navigation
   * Make sure to use a unique name for the page
   */
  sdk.navigation.addPage("/quickssrf", {
    body: root,
    onEnter: () => {
      const uiStore = useUIStore();
      const editorStore = useEditorStore();

      uiStore.btnCount = 0;
      sidebarItem.setCount(uiStore.btnCount);
      editorStore.refreshEditors();
    },
  });

  sidebarItem = sdk.sidebar.registerItem("QuickSSRF", "/quickssrf", {
    icon: "fas fa-globe",
  });
};
