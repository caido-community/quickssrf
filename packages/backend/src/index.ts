import type { DefineAPI, SDK } from "caido:plugin";

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
import type { BackendEvents } from "./types";

export type API = DefineAPI<{
  createSession: typeof apiCreateSession;
  getSessions: typeof apiGetSessions;
  getSession: typeof apiGetSession;
  deleteSession: typeof apiDeleteSession;
  stopSession: typeof apiStopSession;
  resumeSession: typeof apiResumeSession;
  pollSession: typeof apiPollSession;
  updateSessionTitle: typeof apiUpdateSessionTitle;
  getActiveSessionIds: typeof apiGetActiveSessionIds;

  getProviders: typeof apiGetProviders;
  getProvider: typeof apiGetProvider;
  addProvider: typeof apiAddProvider;
  updateProvider: typeof apiUpdateProvider;
  deleteProvider: typeof apiDeleteProvider;

  getInteractions: typeof apiGetInteractions;
  deleteInteraction: typeof apiDeleteInteraction;
  clearInteractions: typeof apiClearInteractions;

  getConfig: typeof apiGetConfig;
  updateConfig: typeof apiUpdateConfig;

  startPolling: typeof apiStartPolling;
  stopPolling: typeof apiStopPolling;
  getPollingStatus: typeof apiGetPollingStatus;
}>;

export type { BackendEvents } from "./types";

export async function init(sdk: SDK<API, BackendEvents>) {
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
