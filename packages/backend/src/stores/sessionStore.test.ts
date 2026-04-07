import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockFs } from "../__tests__/mockFs";
import { createMockSDK } from "../__tests__/mockSdk";

const mockFs = createMockFs();
const mockSdk = createMockSDK();

vi.mock("fs/promises", () => mockFs);
vi.mock("../sdk", () => ({
  requireSDK: () => mockSdk,
}));

const { sessionStore } = await import("./sessionStore");

const makeSession = (id: string, status = "active" as const) => ({
  id,
  providerId: "p-1",
  providerKind: "interactsh",
  title: `Session ${id}`,
  url: `https://${id}.oast.site`,
  status,
  createdAt: new Date().toISOString(),
  interactionCount: 0,
});

const makeInteraction = (id: string, sessionId: string, index: number) => ({
  id,
  sessionId,
  index,
  protocol: "dns" as const,
  rawRequest: "request data",
  rawResponse: "response data",
  remoteAddress: "1.2.3.4",
  timestamp: new Date().toISOString(),
  uniqueId: `uid-${id}`,
  fullId: `fid-${id}`,
});

describe("sessionStore", () => {
  beforeEach(() => {
    mockFs._store.clear();
    vi.clearAllMocks();
  });

  describe("addSession", () => {
    it("creates session file and emits event", async () => {
      const session = makeSession("s-1");
      await sessionStore.addSession(session);

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockSdk.api.send).toHaveBeenCalledWith("session:created", session);
    });

    it("persists provider session alongside session data", async () => {
      const session = makeSession("s-2");
      const providerSession = {
        providerId: "s-2",
        providerKind: "interactsh" as const,
        serverUrl: "https://oast.site",
        secretKey: "secret123",
        correlationId: "corr123",
      };

      await sessionStore.addSession(session, providerSession);

      const restored = await sessionStore.getProviderSession("s-2");
      expect(restored).toBeDefined();
      expect(restored!.secretKey).toBe("secret123");
    });
  });

  describe("getSessions", () => {
    it("returns empty array when no sessions", async () => {
      const sessions = await sessionStore.getSessions();
      expect(sessions).toEqual([]);
    });

    it("returns sessions sorted by createdAt ascending", async () => {
      const s1 = makeSession("s-1");
      s1.createdAt = "2025-01-01T00:00:00Z";
      const s2 = makeSession("s-2");
      s2.createdAt = "2025-01-02T00:00:00Z";

      await sessionStore.addSession(s1);
      await sessionStore.addSession(s2);

      const sessions = await sessionStore.getSessions();
      expect(sessions[0]!.id).toBe("s-1");
      expect(sessions[1]!.id).toBe("s-2");
    });
  });

  describe("getSession", () => {
    it("returns session by ID", async () => {
      await sessionStore.addSession(makeSession("s-1"));
      const session = await sessionStore.getSession("s-1");
      expect(session).toBeDefined();
      expect(session!.id).toBe("s-1");
    });

    it("returns undefined for unknown ID", async () => {
      const session = await sessionStore.getSession("unknown");
      expect(session).toBeUndefined();
    });
  });

  describe("updateSessionStatus", () => {
    it("updates status and emits event", async () => {
      await sessionStore.addSession(makeSession("s-1"));
      const updated = await sessionStore.updateSessionStatus("s-1", "stopped");

      expect(updated.status).toBe("stopped");
      expect(mockSdk.api.send).toHaveBeenCalledWith(
        "session:updated",
        expect.objectContaining({ id: "s-1", status: "stopped" }),
      );
    });

    it("throws for unknown session", async () => {
      await expect(
        sessionStore.updateSessionStatus("unknown", "stopped"),
      ).rejects.toThrow("Session not found");
    });
  });

  describe("updateSessionTitle", () => {
    it("updates title and emits event", async () => {
      await sessionStore.addSession(makeSession("s-1"));
      const updated = await sessionStore.updateSessionTitle("s-1", "New Title");

      expect(updated.title).toBe("New Title");
      expect(mockSdk.api.send).toHaveBeenCalledWith(
        "session:updated",
        expect.objectContaining({ title: "New Title" }),
      );
    });
  });

  describe("deleteSession", () => {
    it("removes session file and emits event", async () => {
      await sessionStore.addSession(makeSession("s-1"));
      await sessionStore.deleteSession("s-1");

      const session = await sessionStore.getSession("s-1");
      expect(session).toBeUndefined();
      expect(mockSdk.api.send).toHaveBeenCalledWith("session:deleted", "s-1");
    });
  });

  describe("interactions", () => {
    it("adds interactions and updates count", async () => {
      await sessionStore.addSession(makeSession("s-1"));

      const interactions = [
        makeInteraction("i-1", "s-1", 0),
        makeInteraction("i-2", "s-1", 1),
      ];
      await sessionStore.addInteractions("s-1", interactions);

      const stored = await sessionStore.getInteractions("s-1");
      expect(stored.length).toBe(2);

      expect(mockSdk.api.send).toHaveBeenCalledWith(
        "interaction:received",
        expect.objectContaining({ sessionId: "s-1" }),
      );
    });

    it("returns empty array for session with no interactions", async () => {
      await sessionStore.addSession(makeSession("s-1"));
      const interactions = await sessionStore.getInteractions("s-1");
      expect(interactions).toEqual([]);
    });

    it("deletes single interaction", async () => {
      await sessionStore.addSession(makeSession("s-1"));
      await sessionStore.addInteractions("s-1", [
        makeInteraction("i-1", "s-1", 0),
        makeInteraction("i-2", "s-1", 1),
      ]);

      await sessionStore.deleteInteraction("s-1", "i-1");

      const remaining = await sessionStore.getInteractions("s-1");
      expect(remaining.length).toBe(1);
      expect(remaining[0]!.id).toBe("i-2");
    });

    it("clears all interactions", async () => {
      await sessionStore.addSession(makeSession("s-1"));
      await sessionStore.addInteractions("s-1", [
        makeInteraction("i-1", "s-1", 0),
      ]);

      await sessionStore.clearInteractions("s-1");

      const remaining = await sessionStore.getInteractions("s-1");
      expect(remaining.length).toBe(0);
    });
  });
});
