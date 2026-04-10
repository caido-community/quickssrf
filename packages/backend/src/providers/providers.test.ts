/* eslint-disable compat/compat */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();

vi.mock("caido:http", () => {
  class MockBlob {
    constructor(public parts: string[]) {}
  }
  return { fetch: mockFetch, Blob: MockBlob };
});

const { webhooksiteProvider } = await import("./webhooksite/client");
const { postbinProvider } = await import("./postbin/client");
const { customProvider } = await import("./custom/client");

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe("webhooksiteProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers and returns URL", async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { uuid: "wh-123" }));

    const result = await webhooksiteProvider.register({
      serverUrl: "https://webhook.site",
    });

    expect(result.kind).toBe("Ok");
    if (result.kind === "Ok") {
      expect(result.value.url).toContain("webhook.site/wh-123");
    }
  });

  it("polls and returns interactions", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, {
        data: [
          {
            uuid: "req-1",
            type: "web",
            method: "GET",
            ip: "1.2.3.4",
            content: "body",
            created_at: "2025-01-01",
            url: "/test",
          },
        ],
      }),
    );

    const result = await webhooksiteProvider.poll({
      providerId: "s-1",
      providerKind: "webhooksite",
      serverUrl: "https://webhook.site",
      metadata: { tokenId: "wh-123" },
    });

    expect(result.kind).toBe("Ok");
    if (result.kind === "Ok") {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.protocol).toBe("http");
    }
  });
});

describe("postbinProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers and returns URL", async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { binId: "pb-1" }));

    const result = await postbinProvider.register({
      serverUrl: "https://postbin.example.com",
    });

    expect(result.kind).toBe("Ok");
    if (result.kind === "Ok") {
      expect(result.value.url).toContain("pb-1");
    }
  });

  it("returns empty on 204", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(""),
    });

    const result = await postbinProvider.poll({
      providerId: "s-1",
      providerKind: "postbin",
      serverUrl: "https://postbin.example.com",
      metadata: { binId: "pb-1" },
    });

    expect(result.kind).toBe("Ok");
    if (result.kind === "Ok") {
      expect(result.value.length).toBe(0);
    }
  });
});

describe("customProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("register returns serverUrl as URL", async () => {
    const result = await customProvider.register({
      serverUrl: "https://my-callback.com/api",
    });

    expect(result.kind).toBe("Ok");
    if (result.kind === "Ok") {
      expect(result.value.url).toBe("https://my-callback.com/api");
    }
  });

  it("polls and parses array response", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, [
        {
          id: "c-1",
          protocol: "http",
          source: "1.1.1.1",
          timestamp: Date.now(),
        },
      ]),
    );

    const result = await customProvider.poll({
      providerId: "s-1",
      providerKind: "custom",
      serverUrl: "https://my-callback.com/api",
    });

    expect(result.kind).toBe("Ok");
    if (result.kind === "Ok") {
      expect(result.value.length).toBe(1);
    }
  });

  it("polls and parses data wrapper response", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, {
        data: [{ id: "c-1", source: "2.2.2.2", timestamp: Date.now() }],
      }),
    );

    const result = await customProvider.poll({
      providerId: "s-1",
      providerKind: "custom",
      serverUrl: "https://my-callback.com/api",
    });

    expect(result.kind).toBe("Ok");
    if (result.kind === "Ok") {
      expect(result.value.length).toBe(1);
    }
  });
});
