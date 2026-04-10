import { fetch } from "caido:http";
import type { Interaction, Result } from "shared";
import { err, ok } from "shared";

import type {
  OASTProvider,
  ProviderSession,
  RegisterOptions,
  RegisterResult,
} from "../types";

type WebhookRequest = {
  uuid: string;
  type: string;
  method: string;
  ip: string;
  content: string;
  created_at: string;
  url: string;
};

type WebhookResponse = {
  data: WebhookRequest[];
};

export const webhooksiteProvider: OASTProvider = {
  kind: "webhooksite",

  async register(options: RegisterOptions): Promise<Result<RegisterResult>> {
    try {
      const resp = await fetch(`${options.serverUrl}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!resp.ok)
        return err(`Webhook.site registration failed: HTTP ${resp.status}`);

      const data = JSON.parse(await resp.text()) as { uuid: string };
      const url = `${options.serverUrl}/${data.uuid}`;

      return ok({
        url,
        uniqueId: data.uuid,
        providerSession: {
          providerId: "",
          providerKind: "webhooksite",
          serverUrl: options.serverUrl,
          metadata: { tokenId: data.uuid },
        },
      });
    } catch (e) {
      return err(`Webhook.site registration failed: ${String(e)}`);
    }
  },

  async poll(session: ProviderSession): Promise<Result<Interaction[]>> {
    try {
      const tokenId = session.metadata?.["tokenId"] as string | undefined;
      if (tokenId === undefined) return err("Missing Webhook.site token ID");

      const resp = await fetch(
        `${session.serverUrl}/token/${tokenId}/requests`,
        { method: "GET" },
      );

      if (!resp.ok) return err(`Webhook.site poll failed: HTTP ${resp.status}`);

      const body = JSON.parse(await resp.text()) as WebhookResponse;
      const interactions: Interaction[] = body.data.map((req, i) => ({
        id: req.uuid,
        sessionId: session.providerId,
        index: i,
        protocol: "http" as const,
        rawRequest: req.content,
        rawResponse: "",
        remoteAddress: req.ip,
        timestamp: req.created_at,
        uniqueId: req.uuid,
        fullId: req.url,
      }));

      return ok(interactions);
    } catch (e) {
      return err(`Webhook.site poll failed: ${String(e)}`);
    }
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async deregister(): Promise<Result<void>> {
    return ok(undefined);
  },
};
