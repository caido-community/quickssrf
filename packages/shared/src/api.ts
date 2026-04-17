import type { QuickSSRFConfig, UpdateConfig } from "./config";
import type { Interaction } from "./interaction";
import type { CreateProvider, Provider, UpdateProvider } from "./provider";
import type { Result } from "./result";
import type { Session } from "./session";

export type API = {
  createSession: (providerId?: string) => Promise<Result<Session>>;
  getSessions: () => Promise<Result<Session[]>>;
  getSession: (sessionId: string) => Promise<Result<Session>>;
  deleteSession: (sessionId: string) => Promise<Result<void>>;
  stopSession: (sessionId: string) => Promise<Result<void>>;
  resumeSession: (sessionId: string) => Result<void>;
  pollSession: (sessionId: string) => Promise<Result<Interaction[]>>;
  updateSessionTitle: (
    sessionId: string,
    title: string,
  ) => Promise<Result<Session>>;
  getActiveSessionIds: () => Result<string[]>;

  getProviders: () => Result<Provider[]>;
  getProvider: (providerId: string) => Result<Provider>;
  addProvider: (input: CreateProvider) => Promise<Result<Provider>>;
  updateProvider: (
    providerId: string,
    updates: UpdateProvider,
  ) => Promise<Result<Provider>>;
  deleteProvider: (providerId: string) => Promise<Result<void>>;

  getInteractions: (sessionId: string) => Promise<Result<Interaction[]>>;
  deleteInteraction: (
    sessionId: string,
    interactionId: string,
  ) => Promise<Result<void>>;
  clearInteractions: (sessionId: string) => Promise<Result<void>>;

  getConfig: () => Result<QuickSSRFConfig>;
  updateConfig: (updates: UpdateConfig) => Promise<Result<QuickSSRFConfig>>;

  startPolling: () => Result<void>;
  stopPolling: () => Result<void>;
  getPollingStatus: () => Result<boolean>;
};
