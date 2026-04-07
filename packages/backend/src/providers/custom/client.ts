import { fetch } from "caido:http";
import type { Interaction, Result } from "shared";
import { err, ok } from "shared";

import type {
  OASTProvider,
  ProviderSession,
  RegisterOptions,
  RegisterResult,
} from "../types";

type CustomEvent = {
  id?: string;
  protocol?: string;
  method?: string;
  source?: string;
  rawRequest?: string;
  rawResponse?: string;
  timestamp?: string | number;
};

export const customProvider: OASTProvider = {
  kind: "custom",

  // eslint-disable-next-line @typescript-eslint/require-await
  async register(options: RegisterOptions): Promise<Result<RegisterResult>> {
    return ok({
      url: options.serverUrl,
      uniqueId: options.serverUrl,
      providerSession: {
        providerId: "",
        providerKind: "custom",
        serverUrl: options.serverUrl,
        metadata: { token: options.token },
      },
    });
  },

  async poll(session: ProviderSession): Promise<Result<Interaction[]>> {
    try {
      const headers: Record<string, string> = {};
      const token = session.metadata?.["token"] as string | undefined;
      if (token !== undefined) headers["Authorization"] = `Bearer ${token}`;

      const resp = await fetch(session.serverUrl, {
        method: "GET",
        headers,
      });

      if (!resp.ok) return err(`Custom poll failed: HTTP ${resp.status}`);

      const body = JSON.parse(await resp.text()) as
        | CustomEvent[]
        | {
            data?: CustomEvent[];
            requests?: CustomEvent[];
            events?: CustomEvent[];
          };

      const events = Array.isArray(body)
        ? body
        : (body.data ?? body.requests ?? body.events ?? []);

      const interactions: Interaction[] = events.map((e, i) => ({
        id: e.id ?? `custom-${i}`,
        sessionId: session.providerId,
        index: i,
        protocol: (e.protocol ?? "http") as Interaction["protocol"],
        rawRequest: e.rawRequest ?? JSON.stringify(e),
        rawResponse: e.rawResponse ?? "",
        remoteAddress: e.source ?? "",
        timestamp:
          typeof e.timestamp === "number"
            ? new Date(e.timestamp).toISOString()
            : (e.timestamp ?? new Date().toISOString()),
        uniqueId: e.id ?? `custom-${i}`,
        fullId: e.id ?? `custom-${i}`,
      }));

      return ok(interactions);
    } catch (e) {
      return err(`Custom poll failed: ${String(e)}`);
    }
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async deregister(): Promise<Result<void>> {
    return ok(undefined);
  },
};
