import { DEFAULT_CONFIG } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockFs } from "../__tests__/mockFs";
import { createMockSDK } from "../__tests__/mockSdk";

const mockFs = createMockFs();
const mockSdk = createMockSDK();

vi.mock("fs/promises", () => mockFs);
vi.mock("../sdk", () => ({
  requireSDK: () => mockSdk,
}));

const { configStore } = await import("./configStore");

describe("configStore", () => {
  beforeEach(() => {
    mockFs._store.clear();
    vi.clearAllMocks();
  });

  describe("initialize", () => {
    it("creates config file with defaults when none exists", async () => {
      await configStore.initialize();

      expect(mockFs.writeFile).toHaveBeenCalled();
      const config = configStore.getConfig();
      expect(config.pollingInterval).toBe(DEFAULT_CONFIG.pollingInterval);
      expect(config.autoPolling).toBe(DEFAULT_CONFIG.autoPolling);
    });

    it("loads existing config from file", async () => {
      mockFs._store.set(
        "/tmp/quickssrf-test/config.json",
        JSON.stringify({ pollingInterval: 10000, autoPolling: false }),
      );

      await configStore.initialize();

      const config = configStore.getConfig();
      expect(config.pollingInterval).toBe(10000);
      expect(config.autoPolling).toBe(false);
    });

    it("merges loaded config with defaults", async () => {
      mockFs._store.set(
        "/tmp/quickssrf-test/config.json",
        JSON.stringify({ pollingInterval: 3000 }),
      );

      await configStore.initialize();

      const config = configStore.getConfig();
      expect(config.pollingInterval).toBe(3000);
      expect(config.autoPolling).toBe(DEFAULT_CONFIG.autoPolling);
    });
  });

  describe("getConfig", () => {
    it("returns a copy of config", async () => {
      await configStore.initialize();
      const config1 = configStore.getConfig();
      const config2 = configStore.getConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe("updateConfig", () => {
    it("updates and persists config", async () => {
      await configStore.initialize();
      await configStore.updateConfig({ pollingInterval: 8000 });

      const config = configStore.getConfig();
      expect(config.pollingInterval).toBe(8000);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it("emits config:updated event", async () => {
      await configStore.initialize();
      await configStore.updateConfig({ autoPolling: false });

      expect(mockSdk.api.send).toHaveBeenCalledWith(
        "config:updated",
        expect.objectContaining({ autoPolling: false }),
      );
    });

    it("rejects invalid config", async () => {
      await configStore.initialize();
      await expect(
        configStore.updateConfig({ pollingInterval: 500 }),
      ).rejects.toThrow();
    });
  });
});
