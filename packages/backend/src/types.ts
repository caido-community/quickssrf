import type { DefineEvents, SDK } from "caido:plugin";
import type { BackendEventMap } from "shared";

import type { API } from ".";

export type BackendEvents = DefineEvents<BackendEventMap>;

export type BackendSDK = SDK<API, BackendEvents>;
