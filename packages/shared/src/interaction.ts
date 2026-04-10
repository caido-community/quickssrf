import { z } from "zod";

export const INTERACTION_PROTOCOLS = [
  "dns",
  "http",
  "https",
  "smtp",
  "smtps",
  "ftp",
  "ftps",
  "smb",
  "ldap",
  "responder",
  "unknown",
] as const;

export const InteractionProtocolSchema = z.enum(INTERACTION_PROTOCOLS);
export type InteractionProtocol = z.infer<typeof InteractionProtocolSchema>;

export const InteractionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  index: z.number().int().nonnegative(),
  protocol: InteractionProtocolSchema,
  rawRequest: z.string(),
  rawResponse: z.string(),
  remoteAddress: z.string(),
  timestamp: z.string(),
  uniqueId: z.string(),
  fullId: z.string(),
  qType: z.string().optional(),
});

export type Interaction = z.infer<typeof InteractionSchema>;
