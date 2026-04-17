import type { SDK } from "caido:plugin";
import type { Spec } from "shared";

import {
  apiAddProvider,
  apiClearInteractions,
  apiCreateSession,
  apiDeleteInteraction,
  apiDeleteProvider,
  apiDeleteSession,
  apiGetActiveSessionIds,
  apiGetConfig,
  apiGetInteractions,
  apiGetPollingStatus,
  apiGetProvider,
  apiGetProviders,
  apiGetSession,
  apiGetSessions,
  apiPollSession,
  apiResumeSession,
  apiStartPolling,
  apiStopPolling,
  apiStopSession,
  apiUpdateConfig,
  apiUpdateProvider,
  apiUpdateSessionTitle,
} from "./api";
import { setSDK } from "./sdk";
import { restartPolling, restoreSessions, startPolling } from "./services";
import { configStore, providerStore } from "./stores";

export async function init(sdk: SDK<Spec>) {
  setSDK(sdk);

  await configStore.initialize();
  await providerStore.initialize();

  sdk.api.register("createSession", apiCreateSession);
  sdk.api.register("getSessions", apiGetSessions);
  sdk.api.register("getSession", apiGetSession);
  sdk.api.register("deleteSession", apiDeleteSession);
  sdk.api.register("stopSession", apiStopSession);
  sdk.api.register("resumeSession", apiResumeSession);
  sdk.api.register("pollSession", apiPollSession);
  sdk.api.register("updateSessionTitle", apiUpdateSessionTitle);
  sdk.api.register("getActiveSessionIds", apiGetActiveSessionIds);

  sdk.api.register("getProviders", apiGetProviders);
  sdk.api.register("getProvider", apiGetProvider);
  sdk.api.register("addProvider", apiAddProvider);
  sdk.api.register("updateProvider", apiUpdateProvider);
  sdk.api.register("deleteProvider", apiDeleteProvider);

  sdk.api.register("getInteractions", apiGetInteractions);
  sdk.api.register("deleteInteraction", apiDeleteInteraction);
  sdk.api.register("clearInteractions", apiClearInteractions);

  sdk.api.register("getConfig", apiGetConfig);
  sdk.api.register("updateConfig", apiUpdateConfig);

  sdk.api.register("startPolling", apiStartPolling);
  sdk.api.register("stopPolling", apiStopPolling);
  sdk.api.register("getPollingStatus", apiGetPollingStatus);

  sdk.events.onProjectChange(async () => {
    await configStore.initialize();
    await providerStore.initialize();
    await restoreSessions();
    restartPolling();
  });

  await restoreSessions();
  startPolling();

  sdk.console.log("QuickSSRF v2.0 initialized");
}
