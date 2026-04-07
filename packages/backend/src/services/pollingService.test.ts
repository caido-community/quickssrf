import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../sdk", () => ({
  requireSDK: () => ({
    console: { log: vi.fn() },
  }),
}));

vi.mock("../stores", () => ({
  configStore: {
    getConfig: vi.fn().mockReturnValue({
      pollingInterval: 1000,
      autoPolling: true,
    }),
  },
}));

vi.mock("./sessionService", () => ({
  getActiveSessionIds: vi.fn().mockReturnValue([]),
  pollSession: vi.fn(),
}));

const { startPolling, stopPolling, isPolling, restartPolling } =
  await import("./pollingService");

describe("pollingService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopPolling();
  });

  afterEach(() => {
    stopPolling();
    vi.useRealTimers();
  });

  describe("startPolling", () => {
    it("starts polling when autoPolling is true", () => {
      startPolling();
      expect(isPolling()).toBe(true);
    });

    it("does not start twice", () => {
      startPolling();
      startPolling();
      expect(isPolling()).toBe(true);
    });
  });

  describe("stopPolling", () => {
    it("stops polling", () => {
      startPolling();
      stopPolling();
      expect(isPolling()).toBe(false);
    });

    it("does nothing when not polling", () => {
      stopPolling();
      expect(isPolling()).toBe(false);
    });
  });

  describe("restartPolling", () => {
    it("restarts polling", () => {
      startPolling();
      restartPolling();
      expect(isPolling()).toBe(true);
    });
  });

  describe("isPolling", () => {
    it("returns false initially", () => {
      expect(isPolling()).toBe(false);
    });

    it("returns true after start", () => {
      startPolling();
      expect(isPolling()).toBe(true);
    });
  });
});
