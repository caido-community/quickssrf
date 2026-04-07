import { fetch } from "caido:http";
import type { Interaction, Result } from "shared";
import { err, ok } from "shared";

import type {
  OASTProvider,
  ProviderSession,
  RegisterOptions,
  RegisterResult,
} from "../types";

type PostbinRequest = {
  body: unknown;
  headers: Record<string, string>;
  method: string;
  querystring: string | undefined;
  inserted: number;
};

function formatHeaders(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

export const postbinProvider: OASTProvider = {
  kind: "postbin",

  async register(options: RegisterOptions): Promise<Result<RegisterResult>> {
    try {
      const resp = await fetch(`${options.serverUrl}/api/bin`, {
        method: "POST",
      });

      if (!resp.ok)
        return err(`PostBin registration failed: HTTP ${resp.status}`);

      const data = JSON.parse(await resp.text()) as { binId: string };
      const url = `${options.serverUrl}/${data.binId}`;

      return ok({
        url,
        uniqueId: data.binId,
        providerSession: {
          providerId: "",
          providerKind: "postbin",
          serverUrl: options.serverUrl,
          metadata: { binId: data.binId },
        },
      });
    } catch (e) {
      return err(`PostBin registration failed: ${String(e)}`);
    }
  },

  async poll(session: ProviderSession): Promise<Result<Interaction[]>> {
    try {
      const binId = session.metadata?.["binId"] as string | undefined;
      if (binId === undefined) return err("Missing PostBin bin ID");

      const resp = await fetch(
        `${session.serverUrl}/api/bin/${binId}/req/shift`,
        { method: "GET" },
      );

      if (resp.status === 204) return ok([]);
      if (resp.status === 404) return ok([]);
      if (!resp.ok) return err(`PostBin poll failed: HTTP ${resp.status}`);

      const req = JSON.parse(await resp.text()) as PostbinRequest;
      const sourceIp =
        req.headers["x-real-ip"] ??
        req.headers["cf-connecting-ip"] ??
        req.headers["x-forwarded-for"] ??
        "";
      const qs =
        req.querystring !== undefined && req.querystring !== ""
          ? `?${req.querystring}`
          : "";
      const body =
        typeof req.body === "string"
          ? req.body
          : req.body !== undefined
            ? JSON.stringify(req.body, undefined, 2)
            : "";

      const interaction: Interaction = {
        id: `${binId}-${req.inserted}`,
        sessionId: session.providerId,
        index: 0,
        protocol: "http",
        rawRequest: `${req.method} /${binId}${qs} HTTP/1.1\n${formatHeaders(req.headers)}${body !== "" ? `\n\n${body}` : ""}`,
        rawResponse: "",
        remoteAddress: sourceIp,
        timestamp: new Date(req.inserted).toISOString(),
        uniqueId: binId,
        fullId: `${binId}-${req.inserted}`,
      };

      return ok([interaction]);
    } catch (e) {
      return err(`PostBin poll failed: ${String(e)}`);
    }
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async deregister(): Promise<Result<void>> {
    return ok(undefined);
  },
};
