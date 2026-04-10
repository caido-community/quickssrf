import type { Interaction, ProviderKind, Result } from "shared";

export type RegisterOptions = {
  serverUrl: string;
  correlationIdLength?: number;
  correlationIdNonceLength?: number;
  token?: string;
};

export type RegisterResult = {
  url: string;
  uniqueId: string;
  providerSession: ProviderSession;
};

export type ProviderSession = {
  providerId: string;
  providerKind: ProviderKind;
  secretKey?: string;
  correlationId?: string;
  serverUrl: string;
  metadata?: Record<string, unknown>;
};

export type OASTProvider = {
  readonly kind: ProviderKind;

  register(options: RegisterOptions): Promise<Result<RegisterResult>>;

  poll(session: ProviderSession): Promise<Result<Interaction[]>>;

  deregister(session: ProviderSession): Promise<Result<void>>;
};
