export class QuickSSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuickSSRFError";
  }
}

export class SDKNotInitializedError extends QuickSSRFError {
  constructor() {
    super("SDK not initialized. Call init() first.");
    this.name = "SDKNotInitializedError";
  }
}

export class ProviderError extends QuickSSRFError {
  constructor(
    public readonly providerId: string,
    reason: string,
  ) {
    super(`Provider ${providerId}: ${reason}`);
    this.name = "ProviderError";
  }
}

export class SessionError extends QuickSSRFError {
  constructor(
    public readonly sessionId: string,
    reason: string,
  ) {
    super(`Session ${sessionId}: ${reason}`);
    this.name = "SessionError";
  }
}

export class SessionNotFoundError extends QuickSSRFError {
  constructor(public readonly sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = "SessionNotFoundError";
  }
}

export class ProviderNotFoundError extends QuickSSRFError {
  constructor(public readonly providerId: string) {
    super(`Provider not found: ${providerId}`);
    this.name = "ProviderNotFoundError";
  }
}

export class CryptoError extends QuickSSRFError {
  constructor(reason: string) {
    super(`Crypto error: ${reason}`);
    this.name = "CryptoError";
  }
}

export class ValidationError extends QuickSSRFError {
  constructor(reason: string) {
    super(`Validation error: ${reason}`);
    this.name = "ValidationError";
  }
}

export function isQuickSSRFError(error: unknown): error is QuickSSRFError {
  return error instanceof QuickSSRFError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
