import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockSDK } from "../__tests__/mockSdk";

const mockSdk = createMockSDK();

vi.mock("../sdk", () => ({
  requireSDK: () => mockSdk,
}));

const { secretStore } = await import("./secretStore");

describe("secretStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("get", () => {
    it("returns env var value with prefix", () => {
      mockSdk.env.getVar.mockReturnValue("secret-value");

      const result = secretStore.get("MY_KEY");

      expect(mockSdk.env.getVar).toHaveBeenCalledWith("QUICKSSRF_MY_KEY");
      expect(result).toBe("secret-value");
    });

    it("returns undefined when not set", () => {
      mockSdk.env.getVar.mockReturnValue(undefined);

      const result = secretStore.get("MISSING");
      expect(result).toBeUndefined();
    });
  });

  describe("set", () => {
    it("sets env var with secret flag", async () => {
      await secretStore.set("MY_KEY", "my-value");

      expect(mockSdk.env.setVar).toHaveBeenCalledWith({
        name: "QUICKSSRF_MY_KEY",
        value: "my-value",
        secret: true,
        global: true,
      });
    });
  });

  describe("clear", () => {
    it("sets env var to empty string", async () => {
      await secretStore.clear("MY_KEY");

      expect(mockSdk.env.setVar).toHaveBeenCalledWith({
        name: "QUICKSSRF_MY_KEY",
        value: "",
        secret: true,
        global: true,
      });
    });
  });
});
