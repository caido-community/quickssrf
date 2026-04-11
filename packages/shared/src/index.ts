import type { DefinePluginPackageSpec } from "caido:plugin";

import type { API } from "./api";
import type { Events } from "./events";

export { type Result, ok, err } from "./result";

export {
  PROVIDER_KINDS,
  ProviderKindSchema,
  type ProviderKind,
  ProviderSchema,
  type Provider,
  CreateProviderSchema,
  type CreateProvider,
  UpdateProviderSchema,
  type UpdateProvider,
  DEFAULT_PROVIDERS,
  QUICK_ADD_PRESETS,
  PROVIDER_PROTOCOLS,
  PROVIDER_NOTES,
} from "./provider";

export {
  INTERACTION_PROTOCOLS,
  InteractionProtocolSchema,
  type InteractionProtocol,
  InteractionSchema,
  type Interaction,
} from "./interaction";

export {
  SESSION_STATUSES,
  SessionStatusSchema,
  type SessionStatus,
  SessionSchema,
  type Session,
} from "./session";

export {
  QuickSSRFConfigSchema,
  type QuickSSRFConfig,
  DEFAULT_CONFIG,
  UpdateConfigSchema,
  type UpdateConfig,
} from "./config";

export type Spec = DefinePluginPackageSpec<{
  manifestId: "quickssrf";
  api: API;
  events: Events;
}>;
