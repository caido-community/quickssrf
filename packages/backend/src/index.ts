import type { DefineAPI, SDK } from "caido:plugin";

export type API = DefineAPI<never>;

export function init(sdk: SDK<API>) {}
