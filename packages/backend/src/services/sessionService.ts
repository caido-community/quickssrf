import { randomUUID } from "crypto";

import type { Interaction, Result, Session } from "shared";
import { err, ok } from "shared";

import { getErrorMessage } from "../errors";
import { getProvider } from "../providers";
import type { ProviderSession } from "../providers/types";
import {
  configStore,
  providerStore,
  secretStore,
  sessionStore,
} from "../stores";
import { ensureKeysWithStorage } from "../utils/crypto";

const activeSessions = new Map<string, ProviderSession>();
const RSA_KEY_STORAGE = "RSA_KEYPAIR";

export async function restoreSessions(): Promise<void> {
  activeSessions.clear();

  await ensureKeysWithStorage(
    () => secretStore.get(RSA_KEY_STORAGE),
    (data) => secretStore.set(RSA_KEY_STORAGE, data),
  );

  const sessions = await sessionStore.getSessions();
  for (const session of sessions) {
    if (session.status !== "active" && session.status !== "polling") continue;

    const providerSession = await sessionStore.getProviderSession(session.id);
    if (providerSession !== undefined) {
      activeSessions.set(session.id, providerSession);
    } else {
      await sessionStore.updateSessionStatus(session.id, "stopped");
    }
  }
}

export async function createSession(
  providerId?: string,
): Promise<Result<Session>> {
  try {
    const config = configStore.getConfig();
    const resolvedId = providerId ?? config.defaultProviderId;

    const provider =
      resolvedId !== undefined
        ? providerStore.getProvider(resolvedId)
        : providerStore.getDefaultProvider();

    if (provider === undefined) {
      return err("No provider available. Add a provider in Settings.");
    }

    const impl = getProvider(provider.kind);
    if (impl === undefined) {
      return err(`Provider type "${provider.kind}" is not supported.`);
    }

    const registerResult = await impl.register({
      serverUrl: provider.url,
      token: provider.token,
      correlationIdLength: config.correlationIdLength,
      correlationIdNonceLength: config.correlationIdNonceLength,
    });

    if (registerResult.kind === "Error") {
      return err(`Registration failed: ${registerResult.error}`);
    }

    const { url, uniqueId, providerSession } = registerResult.value;
    const sessionId = randomUUID();

    const session: Session = {
      id: sessionId,
      providerId: provider.id,
      providerKind: provider.kind,
      title: uniqueId.slice(0, 8),
      url,
      status: "active",
      createdAt: new Date().toISOString(),
      interactionCount: 0,
    };

    providerSession.providerId = sessionId;
    activeSessions.set(sessionId, providerSession);

    await sessionStore.addSession(session, providerSession);

    if (provider.kind === "postbin") {
      setTimeout(
        async () => {
          if (activeSessions.has(sessionId)) {
            activeSessions.delete(sessionId);
            await sessionStore.updateSessionStatus(sessionId, "expired");
          }
        },
        30 * 60 * 1000,
      );
    }
    return ok(session);
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export async function stopSession(sessionId: string): Promise<Result<void>> {
  try {
    const providerSession = activeSessions.get(sessionId);
    if (providerSession !== undefined) {
      const impl = getProvider(providerSession.providerKind);
      if (impl !== undefined) {
        await impl.deregister(providerSession);
      }
      activeSessions.delete(sessionId);
    }

    await sessionStore.updateSessionStatus(sessionId, "stopped");
    return ok(undefined);
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export async function deleteSession(sessionId: string): Promise<Result<void>> {
  try {
    const providerSession = activeSessions.get(sessionId);
    if (providerSession !== undefined) {
      const impl = getProvider(providerSession.providerKind);
      if (impl !== undefined) {
        await impl.deregister(providerSession);
      }
      activeSessions.delete(sessionId);
    }

    await sessionStore.deleteSession(sessionId);
    return ok(undefined);
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export async function pollSession(
  sessionId: string,
): Promise<Result<Interaction[]>> {
  try {
    const providerSession = activeSessions.get(sessionId);
    if (providerSession === undefined) {
      return err("Session is not active. Cannot poll.");
    }

    const impl = getProvider(providerSession.providerKind);
    if (impl === undefined) {
      return err(`Provider "${providerSession.providerKind}" not found.`);
    }

    const result = await impl.poll(providerSession);
    if (result.kind === "Error") {
      if (
        result.error === "SESSION_EXPIRED" ||
        result.error.includes("Decryption error") ||
        result.error.includes("OAEP")
      ) {
        activeSessions.delete(sessionId);
        await sessionStore.updateSessionStatus(sessionId, "expired");
        return err("Session expired or keys changed. Create a new session.");
      }
      return result;
    }

    if (result.value.length > 0) {
      await sessionStore.addInteractions(sessionId, result.value);
    }

    return result;
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export async function updateSessionTitle(
  sessionId: string,
  title: string,
): Promise<Result<Session>> {
  try {
    const session = await sessionStore.updateSessionTitle(sessionId, title);
    return ok(session);
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export function getActiveSessionIds(): string[] {
  return [...activeSessions.keys()];
}

export function isSessionActive(sessionId: string): boolean {
  return activeSessions.has(sessionId);
}
