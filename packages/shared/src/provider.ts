import { z } from "zod";

export const PROVIDER_KINDS = [
  "interactsh",
  "webhooksite",
  "postbin",
  "custom",
] as const;

export const ProviderKindSchema = z.enum(PROVIDER_KINDS);
export type ProviderKind = z.infer<typeof ProviderKindSchema>;

export const PROVIDER_PROTOCOLS: Record<ProviderKind, string[]> = {
  interactsh: ["DNS", "HTTP/S", "SMTP", "LDAP", "FTP*", "SMB*"],
  webhooksite: ["HTTP/S", "DNS", "SMTP"],
  postbin: ["HTTP"],
  custom: ["HTTP"],
};

export const PROVIDER_NOTES: Record<ProviderKind, string> = {
  interactsh: "FTP/SMB require self-hosted server",
  webhooksite: "DNS via DNSHook, SMTP via EmailHook",
  postbin: "Bins expire after 30 minutes",
  custom: "Depends on your endpoint",
};

export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  kind: ProviderKindSchema,
  url: z.url(),
  token: z.string().optional(),
  enabled: z.boolean(),
});

export type Provider = z.infer<typeof ProviderSchema>;

export const CreateProviderSchema = ProviderSchema.omit({ id: true });
export type CreateProvider = z.infer<typeof CreateProviderSchema>;

export const UpdateProviderSchema = ProviderSchema.partial().omit({ id: true });
export type UpdateProvider = z.infer<typeof UpdateProviderSchema>;

export const DEFAULT_PROVIDERS: Omit<Provider, "id">[] = [
  {
    name: "oast.site",
    kind: "interactsh",
    url: "https://oast.site",
    enabled: true,
  },
];

export const QUICK_ADD_PRESETS: Omit<Provider, "id">[] = [
  {
    name: "oast.site",
    kind: "interactsh",
    url: "https://oast.site",
    enabled: true,
  },
  {
    name: "oast.fun",
    kind: "interactsh",
    url: "https://oast.fun",
    enabled: true,
  },
  {
    name: "oast.me",
    kind: "interactsh",
    url: "https://oast.me",
    enabled: true,
  },
  {
    name: "oast.pro",
    kind: "interactsh",
    url: "https://oast.pro",
    enabled: true,
  },
  {
    name: "oast.live",
    kind: "interactsh",
    url: "https://oast.live",
    enabled: true,
  },
  {
    name: "Webhook.site",
    kind: "webhooksite",
    url: "https://webhook.site",
    enabled: true,
  },
  {
    name: "PostBin",
    kind: "postbin",
    url: "https://www.postb.in",
    enabled: true,
  },
];
