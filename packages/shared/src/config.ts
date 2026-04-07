import { z } from "zod";

export const QuickSSRFConfigSchema = z.object({
  defaultProviderId: z.string().optional(),
  pollingInterval: z.number().int().min(1000).max(60000),
  autoPolling: z.boolean(),
  notificationsEnabled: z.boolean(),
  correlationIdLength: z.number().int().min(1).max(63),
  correlationIdNonceLength: z.number().int().min(1).max(63),
});

export type QuickSSRFConfig = z.infer<typeof QuickSSRFConfigSchema>;

export const DEFAULT_CONFIG: QuickSSRFConfig = {
  defaultProviderId: undefined,
  pollingInterval: 5000,
  autoPolling: true,
  notificationsEnabled: false,
  correlationIdLength: 20,
  correlationIdNonceLength: 13,
};

export const UpdateConfigSchema = QuickSSRFConfigSchema.partial();
export type UpdateConfig = z.infer<typeof UpdateConfigSchema>;
