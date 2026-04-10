import { describe, expect, it } from "vitest";

import {
  CryptoError,
  getErrorMessage,
  isQuickSSRFError,
  ProviderError,
  ProviderNotFoundError,
  QuickSSRFError,
  SDKNotInitializedError,
  SessionError,
  SessionNotFoundError,
  ValidationError,
} from ".";

describe("error classes", () => {
  it("QuickSSRFError is an Error", () => {
    const err = new QuickSSRFError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("QuickSSRFError");
    expect(err.message).toBe("test");
  });

  it("SDKNotInitializedError has correct message", () => {
    const err = new SDKNotInitializedError();
    expect(err.message).toContain("SDK not initialized");
    expect(err).toBeInstanceOf(QuickSSRFError);
  });

  it("ProviderError includes providerId", () => {
    const err = new ProviderError("p-1", "connection failed");
    expect(err.providerId).toBe("p-1");
    expect(err.message).toContain("p-1");
    expect(err.message).toContain("connection failed");
  });

  it("SessionError includes sessionId", () => {
    const err = new SessionError("s-1", "expired");
    expect(err.sessionId).toBe("s-1");
    expect(err.message).toContain("s-1");
  });

  it("SessionNotFoundError includes sessionId", () => {
    const err = new SessionNotFoundError("s-99");
    expect(err.sessionId).toBe("s-99");
    expect(err.message).toContain("s-99");
  });

  it("ProviderNotFoundError includes providerId", () => {
    const err = new ProviderNotFoundError("p-99");
    expect(err.providerId).toBe("p-99");
    expect(err.message).toContain("p-99");
  });

  it("CryptoError has correct name", () => {
    const err = new CryptoError("bad key");
    expect(err.name).toBe("CryptoError");
    expect(err.message).toContain("bad key");
  });

  it("ValidationError has correct name", () => {
    const err = new ValidationError("invalid input");
    expect(err.name).toBe("ValidationError");
    expect(err.message).toContain("invalid input");
  });
});

describe("isQuickSSRFError", () => {
  it("returns true for QuickSSRFError", () => {
    expect(isQuickSSRFError(new QuickSSRFError("test"))).toBe(true);
  });

  it("returns true for subclasses", () => {
    expect(isQuickSSRFError(new SessionNotFoundError("s-1"))).toBe(true);
    expect(isQuickSSRFError(new ProviderError("p-1", "fail"))).toBe(true);
  });

  it("returns false for plain Error", () => {
    expect(isQuickSSRFError(new Error("test"))).toBe(false);
  });

  it("returns false for non-errors", () => {
    expect(isQuickSSRFError("string")).toBe(false);
    expect(isQuickSSRFError(undefined)).toBe(false);
    expect(isQuickSSRFError(42)).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("extracts message from Error", () => {
    expect(getErrorMessage(new Error("hello"))).toBe("hello");
  });

  it("converts non-Error to string", () => {
    expect(getErrorMessage("raw string")).toBe("raw string");
    expect(getErrorMessage(42)).toBe("42");
    expect(getErrorMessage(undefined)).toBe("undefined");
  });
});
