import type { QuickSSRFConfig } from "./config";
import type { Interaction } from "./interaction";
import type { Provider } from "./provider";
import type { Session } from "./session";

export type Events = {
  "session:created": (session: Session) => void;
  "session:updated": (session: Session) => void;
  "session:deleted": (sessionId: string) => void;
  "interaction:received": (data: {
    sessionId: string;
    interactions: Interaction[];
  }) => void;
  "provider:created": (provider: Provider) => void;
  "provider:updated": (provider: Provider) => void;
  "provider:deleted": (providerId: string) => void;
  "config:updated": (config: QuickSSRFConfig) => void;
};
