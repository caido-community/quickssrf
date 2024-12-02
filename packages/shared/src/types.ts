export type RuleStatusDTO = "Untested" | "Enforced" | "Bypassed" | "Unexpected";

export type EventQuickssrfDTO = {
    protocol: string;
    uniqueId: string;
    fullId: string;
    qType: string;
    rawRequest: string;
    rawResponse: string;
    remoteAddress: string;
    timestamp: string; // ISO 8601 date-time string
};