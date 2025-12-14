import type { Caido } from "@caido/sdk-frontend";
import type { API, BackendEvents } from "backend";

export type FrontendSDK = Caido<API, BackendEvents>;

import type { Interaction as BaseInteraction } from "shared";

export interface Interaction extends BaseInteraction {
  httpPath: string;
}
