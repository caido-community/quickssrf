import { z } from "zod";

export const SESSION_STATUSES = [
  "active",
  "polling",
  "stopped",
  "expired",
  "error",
] as const;

export const SessionStatusSchema = z.enum(SESSION_STATUSES);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  providerKind: z.string(),
  title: z.string(),
  url: z.string(),
  status: SessionStatusSchema,
  createdAt: z.string(),
  interactionCount: z.number().int().nonnegative(),
});

export type Session = z.infer<typeof SessionSchema>;
