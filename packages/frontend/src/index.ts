import { Classic } from "@caido/primevue";
import PrimeVue from "primevue/config";
import {createApp, ref} from "vue";

import App from "./views/App.vue";

import "./styles/index.css";

import manifest from "../../../manifest.json" with { type: "json" };

import { SDKPlugin } from "./plugins/sdk";
import type { FrontendSDK } from "./types";



// This is the entry point for the frontend plugin
export let QuickSSRFBtn: any;
export const QuickSSRFBtnCount = ref(0);
export const init = (sdk: FrontendSDK) => {
  const app = createApp(App);

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

  // Set the ID of the root element
  // We use the manifest ID to ensure that the ID is unique per-plugin
  // This is necessary to prevent styling conflicts between plugins
  // The value here should be the same as the prefixWrap plugin in postcss.config.js
  root.id = `plugin--${manifest.id}`;

  // Mount the app to the root element
  app.mount(root);

  // Add the page to the navigation
  // Make sure to use a unique name for the page
  sdk.navigation.addPage("/quickssrf", {
    body: root,
    onEnter: () => {QuickSSRFBtnCount.value = 0;QuickSSRFBtn.setCount(QuickSSRFBtnCount.value);},
  });

  QuickSSRFBtn = sdk.sidebar.registerItem("QuickSSRF", "/quickssrf");
  QuickSSRFBtn.setCount(QuickSSRFBtnCount.value);

};
