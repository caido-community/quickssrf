export interface Settings {
  serverURL: string;
  token: string;
  pollingInterval: number;
  correlationIdLength: number;
  correlationIdNonceLength: number;
}

export interface Interaction {
  protocol: string;
  uniqueId: string;
  fullId: string;
  qType: string;
  rawRequest: string;
  rawResponse: string;
  remoteAddress: string;
  timestamp: string;
  httpPath?: string;
  tag?: string;
  serverUrl?: string;
}

export interface InteractshStartOptions {
  serverURL: string;
  token: string;
  pollingInterval?: number;
  correlationIdLength?: number;
  correlationIdNonceLength?: number;
}

export interface GenerateUrlResult {
  url: string;
  uniqueId: string;
}

export interface ActiveUrl {
  url: string;
  uniqueId: string;
  createdAt: string;
  isActive: boolean;
  serverUrl: string;
  tag?: string;
}
