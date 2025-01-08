import type { Caido } from "@caido/sdk-frontend";
import type { API } from "backend";

export type FrontendSDK = Caido<API, never>;

export interface Response {
    protocol: string;
    uniqueId: string; // Converted to camelCase for consistency
    fullId: string; // Converted to camelCase for consistency
    qType: string; // Query type
    rawRequest: string;
    rawResponse: string;
    remoteAddress: string;
    timestamp: string; // Use Date type for parsing if necessary
  }
