import type { Caido } from "@caido/sdk-frontend";
import type { API } from "backend";

export type FrontendSDK = Caido<API, never>;

export type Interaction = {
  protocol: string;
  uniqueId: string;
  fullId: string;
  qType: string;
  rawRequest: string;
  rawResponse: string;
  remoteAddress: string;
  timestamp: string;
  httpPath: string;
};
