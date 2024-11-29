import type {DefineAPI, SDK} from "caido:plugin";

const generateLink = (sdk: SDK, length: number) => {
}

export type API = DefineAPI<{
  generateLink: typeof generateLink;
}>;

export function init(sdk: SDK<API>) {
  // @ts-ignore
  sdk.api.register("generateLink", generateLink);
}