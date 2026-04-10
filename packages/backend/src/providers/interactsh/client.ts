import { Blob, fetch } from "caido:http";
import type { Interaction, InteractionProtocol, Result } from "shared";
import { err, ok } from "shared";

import {
  decryptMessage,
  generateRandomString,
  getEncodedPublicKey,
  initializeKeys,
} from "../../utils/crypto";
import type {
  OASTProvider,
  ProviderSession,
  RegisterOptions,
  RegisterResult,
} from "../types";

type RawInteraction = {
  protocol: string;
  "unique-id": string;
  "full-id": string;
  "raw-request"?: string;
  "raw-response"?: string;
  "remote-address"?: string;
  timestamp: string;
  "q-type"?: string;
};

type PollResponse = {
  data: string[];
  aes_key: string;
};

function parseOrigin(serverUrl: string): string {
  // eslint-disable-next-line compat/compat
  const url = new URL(serverUrl);
  return url.origin;
}

function parseHost(serverUrl: string): string {
  // eslint-disable-next-line compat/compat
  return new URL(serverUrl).host;
}

function toInteraction(
  raw: RawInteraction,
  sessionId: string,
  index: number,
): Interaction {
  return {
    id: `${raw["full-id"]}-${raw.timestamp}-${raw["remote-address"] ?? ""}-${raw.protocol}`,
    sessionId,
    index,
    protocol: (raw.protocol ?? "unknown") as InteractionProtocol,
    rawRequest: raw["raw-request"] ?? "",
    rawResponse: raw["raw-response"] ?? "",
    remoteAddress: raw["remote-address"] ?? "",
    timestamp: raw.timestamp,
    uniqueId: raw["unique-id"],
    fullId: raw["full-id"],
    qType: raw["q-type"],
  };
}

function jsonBlob(data: unknown): Blob {
  return new Blob([JSON.stringify(data)], { type: "application/json" });
}

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token !== undefined) headers["Authorization"] = token;
  return headers;
}

export const interactshProvider: OASTProvider = {
  kind: "interactsh",

  async register(options: RegisterOptions): Promise<Result<RegisterResult>> {
    try {
      initializeKeys();

      const origin = parseOrigin(options.serverUrl);
      const host = parseHost(options.serverUrl);
      const correlationId = generateRandomString(
        options.correlationIdLength ?? 20,
      );
      const secretKey = generateRandomString(32);

      const resp = await fetch(`${origin}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(options.token),
        },
        body: jsonBlob({
          "public-key": getEncodedPublicKey(),
          "secret-key": secretKey,
          "correlation-id": correlationId,
        }),
      });

      if (!resp.ok) return err(`Registration failed: HTTP ${resp.status}`);

      const nonce = generateRandomString(
        options.correlationIdNonceLength ?? 13,
      );

      return ok({
        url: `${origin.replace(host, `${correlationId}${nonce}.${host}`)}`,
        uniqueId: `${correlationId}${nonce}`,
        providerSession: {
          providerId: "",
          providerKind: "interactsh",
          secretKey,
          correlationId,
          serverUrl: options.serverUrl,
          metadata: { token: options.token },
        },
      });
    } catch (e) {
      return err(`Registration failed: ${String(e)}`);
    }
  },

  async poll(session: ProviderSession): Promise<Result<Interaction[]>> {
    try {
      if (
        session.correlationId === undefined ||
        session.secretKey === undefined
      ) {
        return err("Missing session credentials (correlationId or secretKey)");
      }

      const origin = parseOrigin(session.serverUrl);
      const url = `${origin}/poll?id=${session.correlationId}&secret=${session.secretKey}`;

      const resp = await fetch(url, {
        method: "GET",
        headers: authHeaders(session.metadata?.["token"] as string | undefined),
      });

      if (resp.status === 400) return err("SESSION_EXPIRED");
      if (resp.status === 401) return err("Authentication failed");
      if (!resp.ok) return err(`Poll failed: HTTP ${resp.status}`);

      const pollData = JSON.parse(await resp.text()) as PollResponse;
      if (
        pollData.data === undefined ||
        !Array.isArray(pollData.data) ||
        pollData.data.length === 0
      )
        return ok([]);

      const interactions: Interaction[] = [];
      for (let i = 0; i < pollData.data.length; i++) {
        const decrypted = decryptMessage(pollData.aes_key, pollData.data[i]!);
        const raw = JSON.parse(decrypted) as RawInteraction;
        interactions.push(toInteraction(raw, session.providerId, i));
      }

      return ok(interactions);
    } catch (e) {
      return err(`Poll failed: ${String(e)}`);
    }
  },

  async deregister(session: ProviderSession): Promise<Result<void>> {
    try {
      if (
        session.correlationId === undefined ||
        session.secretKey === undefined
      ) {
        return err("Missing session credentials (correlationId or secretKey)");
      }

      const origin = parseOrigin(session.serverUrl);

      const resp = await fetch(`${origin}/deregister`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(session.metadata?.["token"] as string | undefined),
        },
        body: jsonBlob({
          "correlation-id": session.correlationId,
          "secret-key": session.secretKey,
        }),
      });

      if (!resp.ok) return err(`Deregister failed: HTTP ${resp.status}`);
      return ok(undefined);
    } catch (e) {
      return err(`Deregister failed: ${String(e)}`);
    }
  },
};
