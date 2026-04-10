import type { ProviderKind } from "shared";

import { customProvider } from "./custom/client";
import { interactshProvider } from "./interactsh/client";
import { postbinProvider } from "./postbin/client";
import type { OASTProvider } from "./types";
import { webhooksiteProvider } from "./webhooksite/client";

const registry = new Map<ProviderKind, OASTProvider>([
  ["interactsh", interactshProvider],
  ["webhooksite", webhooksiteProvider],
  ["postbin", postbinProvider],
  ["custom", customProvider],
]);

export function getProvider(kind: ProviderKind): OASTProvider | undefined {
  return registry.get(kind);
}
