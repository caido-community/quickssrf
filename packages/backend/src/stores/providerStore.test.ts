import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockFs } from "../__tests__/mockFs";
import { createMockSDK } from "../__tests__/mockSdk";

const mockFs = createMockFs();
const mockSdk = createMockSDK();

vi.mock("fs/promises", () => mockFs);
vi.mock("../sdk", () => ({
  requireSDK: () => mockSdk,
}));

const { providerStore } = await import("./providerStore");

describe("providerStore", () => {
  beforeEach(() => {
    mockFs._store.clear();
    vi.clearAllMocks();
  });

  describe("initialize", () => {
    it("seeds default providers when no file exists", async () => {
      await providerStore.initialize();

      const providers = providerStore.getProviders();
      expect(providers.length).toBe(1);
      expect(providers[0]!.name).toBe("oast.site");
      expect(providers[0]!.kind).toBe("interactsh");
    });

    it("loads existing providers from file", async () => {
      const existing = [
        {
          id: "p-1",
          name: "test",
          kind: "custom",
          url: "https://test.com",
          enabled: true,
        },
      ];
      mockFs._store.set(
        "/tmp/quickssrf-test/providers.json",
        JSON.stringify(existing),
      );

      await providerStore.initialize();

      const providers = providerStore.getProviders();
      expect(providers.length).toBe(1);
      expect(providers[0]!.name).toBe("test");
    });
  });

  describe("getProvider", () => {
    it("returns provider by ID", async () => {
      await providerStore.initialize();
      const providers = providerStore.getProviders();
      const found = providerStore.getProvider(providers[0]!.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe("oast.site");
    });

    it("returns undefined for unknown ID", async () => {
      await providerStore.initialize();
      expect(providerStore.getProvider("unknown")).toBeUndefined();
    });
  });

  describe("addProvider", () => {
    it("adds provider and emits event", async () => {
      await providerStore.initialize();

      const provider = await providerStore.addProvider({
        name: "My Server",
        kind: "interactsh",
        url: "https://my.server.com",
        enabled: true,
      });

      expect(provider.id).toBeDefined();
      expect(provider.name).toBe("My Server");
      expect(providerStore.getProviders().length).toBe(2);
      expect(mockSdk.api.send).toHaveBeenCalledWith(
        "provider:created",
        expect.objectContaining({ name: "My Server" }),
      );
    });

    it("rejects invalid provider", async () => {
      await providerStore.initialize();
      await expect(
        providerStore.addProvider({
          name: "",
          kind: "interactsh",
          url: "https://test.com",
          enabled: true,
        }),
      ).rejects.toThrow();
    });
  });

  describe("updateProvider", () => {
    it("updates provider and emits event", async () => {
      await providerStore.initialize();
      const providers = providerStore.getProviders();
      const id = providers[0]!.id;

      const updated = await providerStore.updateProvider(id, {
        name: "Renamed",
      });

      expect(updated.name).toBe("Renamed");
      expect(mockSdk.api.send).toHaveBeenCalledWith(
        "provider:updated",
        expect.objectContaining({ name: "Renamed" }),
      );
    });

    it("throws for unknown provider", async () => {
      await providerStore.initialize();
      await expect(
        providerStore.updateProvider("unknown", { name: "test" }),
      ).rejects.toThrow("Provider not found");
    });

    it("throws when disabling the last enabled provider", async () => {
      await providerStore.initialize();
      const providers = providerStore.getProviders();
      await expect(
        providerStore.updateProvider(providers[0]!.id, { enabled: false }),
      ).rejects.toThrow("Cannot disable the last enabled provider");
    });
  });

  describe("deleteProvider", () => {
    it("removes provider and emits event", async () => {
      await providerStore.initialize();
      await providerStore.addProvider({
        name: "Extra",
        kind: "interactsh",
        url: "https://extra.oast.site",
        enabled: true,
      });

      const providers = providerStore.getProviders();
      const id = providers[0]!.id;

      await providerStore.deleteProvider(id);

      expect(providerStore.getProviders().length).toBe(1);
      expect(mockSdk.api.send).toHaveBeenCalledWith("provider:deleted", id);
    });

    it("throws when deleting the last provider", async () => {
      await providerStore.initialize();
      const providers = providerStore.getProviders();
      await expect(
        providerStore.deleteProvider(providers[0]!.id),
      ).rejects.toThrow("Cannot delete the last provider");
    });

    it("throws for unknown provider", async () => {
      await providerStore.initialize();
      await expect(providerStore.deleteProvider("unknown")).rejects.toThrow(
        "Provider not found",
      );
    });
  });

  describe("getDefaultProvider", () => {
    it("returns first enabled provider", async () => {
      await providerStore.initialize();
      const defaultProvider = providerStore.getDefaultProvider();
      expect(defaultProvider).toBeDefined();
      expect(defaultProvider!.enabled).toBe(true);
    });
  });
});
