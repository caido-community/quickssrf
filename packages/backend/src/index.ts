import type { DefineAPI, SDK } from "caido:plugin";

export type API = DefineAPI<{}>;

export function init(sdk: SDK<API>) {}
