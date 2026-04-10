/* eslint-disable compat/compat */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();

vi.mock("caido:http", () => {
  class MockBlob {
    constructor(public parts: string[]) {}
  }
  return { fetch: mockFetch, Blob: MockBlob };
});

vi.mock("../../utils/crypto", () => ({
  initializeKeys: vi.fn(),
  getEncodedPublicKey: vi.fn().mockReturnValue("mock-public-key"),
  generateRandomString: vi.fn((len: number) => "a".repeat(len)),
  decryptMessage: vi.fn().mockReturnValue(
    JSON.stringify({
      protocol: "dns",
      "unique-id": "test-uid",
      "full-id": "test-fid",
      "raw-request": "request",
      "raw-response": "response",
      "remote-address": "1.2.3.4",
      timestamp: "2025-01-01T00:00:00Z",
    }),
  ),
}));

const { interactshProvider } = await import("./client");

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe("interactshProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("returns URL on successful registration", async () => {
      mockFetch.mockResolvedValue(mockResponse(200, {}));

      const result = await interactshProvider.register({
        serverUrl: "https://oast.site",
        correlationIdLength: 10,
        correlationIdNonceLength: 5,
      });

      expect(result.kind).toBe("Ok");
      if (result.kind === "Ok") {
        expect(result.value.url).toContain("oast.site");
        expect(result.value.providerSession.providerKind).toBe("interactsh");
        expect(result.value.providerSession.secretKey).toBeDefined();
        expect(result.value.providerSession.correlationId).toBeDefined();
      }
    });

    it("returns error on HTTP failure", async () => {
      mockFetch.mockResolvedValue(mockResponse(500, {}));

      const result = await interactshProvider.register({
        serverUrl: "https://oast.site",
      });

      expect(result.kind).toBe("Error");
    });

    it("returns error on network failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await interactshProvider.register({
        serverUrl: "https://oast.site",
      });

      expect(result.kind).toBe("Error");
      if (result.kind === "Error") {
        expect(result.error).toContain("Network error");
      }
    });
  });

  describe("poll", () => {
    const session = {
      providerId: "s-1",
      providerKind: "interactsh" as const,
      serverUrl: "https://oast.site",
      correlationId: "testcorr",
      secretKey: "testsecret",
    };

    it("returns interactions on successful poll", async () => {
      mockFetch.mockResolvedValue(
        mockResponse(200, {
          data: ["encrypted-data"],
          aes_key: "encrypted-key",
        }),
      );

      const result = await interactshProvider.poll(session);

      expect(result.kind).toBe("Ok");
      if (result.kind === "Ok") {
        expect(result.value.length).toBe(1);
        expect(result.value[0]!.protocol).toBe("dns");
        expect(result.value[0]!.remoteAddress).toBe("1.2.3.4");
      }
    });

    it("returns empty array when no data", async () => {
      mockFetch.mockResolvedValue(
        mockResponse(200, { data: null, aes_key: "" }),
      );

      const result = await interactshProvider.poll(session);

      expect(result.kind).toBe("Ok");
      if (result.kind === "Ok") {
        expect(result.value.length).toBe(0);
      }
    });

    it("returns SESSION_EXPIRED on 400", async () => {
      mockFetch.mockResolvedValue(mockResponse(400, {}));

      const result = await interactshProvider.poll(session);

      expect(result.kind).toBe("Error");
      if (result.kind === "Error") {
        expect(result.error).toBe("SESSION_EXPIRED");
      }
    });

    it("returns auth error on 401", async () => {
      mockFetch.mockResolvedValue(mockResponse(401, {}));

      const result = await interactshProvider.poll(session);

      expect(result.kind).toBe("Error");
      if (result.kind === "Error") {
        expect(result.error).toContain("Authentication");
      }
    });
  });

  describe("deregister", () => {
    it("sends deregister request", async () => {
      mockFetch.mockResolvedValue(mockResponse(200, {}));

      const result = await interactshProvider.deregister({
        providerId: "s-1",
        providerKind: "interactsh",
        serverUrl: "https://oast.site",
        correlationId: "testcorr",
        secretKey: "testsecret",
      });

      expect(result.kind).toBe("Ok");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://oast.site/deregister",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
