import { Classic } from "@caido/primevue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import Tooltip from "primevue/tooltip";
import { createApp } from "vue";

import { SDKPlugin } from "./plugins/sdk";
import { useNotificationsService } from "./services/notifications";
import { useSessionsStore } from "./stores/sessions";
import "./styles/index.css";
import type { FrontendSDK } from "./types";
import App from "./views/App.vue";

export const init = (sdk: FrontendSDK) => {
  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(PrimeVue, { unstyled: true, pt: Classic });
  app.use(ConfirmationService);
  app.directive("tooltip", Tooltip);
  app.use(SDKPlugin, sdk);

  const root = document.createElement("div");
  Object.assign(root.style, { height: "100%", width: "100%" });
  root.id = "plugin--quickssrf";

  app.mount(root);

  sdk.navigation.addPage("/quickssrf", { body: root });
  const sidebarItem = sdk.sidebar.registerItem("QuickSSRF", "/quickssrf", {
    icon: "fas fa-crosshairs",
  });

  const notificationsService = useNotificationsService();
  notificationsService.setSidebarItem(sidebarItem);

  const sessionsStore = useSessionsStore();
  sdk.navigation.onPageChange((event) => {
    const active = event.type === "Plugin" && event.path === "/quickssrf";
    const selectedId = sessionsStore.selectionState.getState();
    notificationsService.setPluginActive(active, selectedId);
  });

  sdk.commands.register("quickssrf.generate-url", {
    name: "Generate OAST URL",
    run: async () => {
      const result = await sdk.backend.createSession();
      if (result.kind === "Ok") {
        await navigator.clipboard.writeText(result.value.url);
        sdk.window.showToast("URL copied to clipboard", {
          variant: "success",
        });
      } else {
        sdk.window.showToast(result.error, { variant: "error" });
      }
    },
    group: "QuickSSRF",
  });

  sdk.commandPalette.register("quickssrf.generate-url");
};
