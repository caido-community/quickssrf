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
  randomFrom: vi.fn((alphabet: string, length: number) =>
    alphabet[0]!.repeat(length),
  ),
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
  XID_ALPHABET: "0",
  ZBASE32_ALPHABET: "y",
}));

const { interactshProvider } = await import("./client");
const { randomFrom, XID_ALPHABET, ZBASE32_ALPHABET } =
  await import("../../utils/crypto");

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

function lastRequestBody(): Record<string, string> {
  const body = mockFetch.mock.lastCall?.[1]?.body as { parts: [string] };
  return JSON.parse(body.parts[0]) as Record<string, string>;
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
        const correlationId = "0".repeat(10);
        const uniqueId = `${correlationId}${"y".repeat(5)}`;

        expect(result.value.url).toBe(`https://${uniqueId}.oast.site`);
        expect(result.value.uniqueId).toBe(uniqueId);
        expect(result.value.providerSession.providerKind).toBe("interactsh");
        expect(result.value.providerSession.secretKey).toBe("a".repeat(32));
        expect(result.value.providerSession.correlationId).toBe(correlationId);
      }

      expect(randomFrom).toHaveBeenCalledWith(XID_ALPHABET, 10);
      expect(randomFrom).toHaveBeenCalledWith(ZBASE32_ALPHABET, 5);

      expect(lastRequestBody()).toMatchObject({
        "correlation-id": "0".repeat(10),
        "secret-key": "a".repeat(32),
      });
    });

    it("uses the server default lengths of 20 and 13", async () => {
      mockFetch.mockResolvedValue(mockResponse(200, {}));

      const result = await interactshProvider.register({
        serverUrl: "https://oast.site",
      });

      expect(randomFrom).toHaveBeenCalledWith(XID_ALPHABET, 20);
      expect(randomFrom).toHaveBeenCalledWith(ZBASE32_ALPHABET, 13);
      expect(result.kind).toBe("Ok");
      if (result.kind === "Ok") {
        expect(result.value.providerSession.correlationId).toBe("0".repeat(20));
        expect(result.value.uniqueId).toBe(
          `${"0".repeat(20)}${"y".repeat(13)}`,
        );
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
