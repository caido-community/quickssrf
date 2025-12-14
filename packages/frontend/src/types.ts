import type { Caido } from "@caido/sdk-frontend";
import type { API, BackendEvents } from "backend";
import type { Interaction as BaseInteraction } from "shared";

export type FrontendSDK = Caido<API, BackendEvents>;

export interface Interaction extends BaseInteraction {
  httpPath: string;
}
