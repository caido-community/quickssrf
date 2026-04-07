import type { SDK } from "caido:plugin";
import type { CreateProvider, Provider, Result, UpdateProvider } from "shared";
import { err } from "shared";

import { getErrorMessage } from "../errors";
import { providerStore } from "../stores";

export function apiGetProviders(_sdk: SDK): Result<Provider[]> {
  return { kind: "Ok", value: providerStore.getProviders() };
}

export function apiGetProvider(
  _sdk: SDK,
  providerId: string,
): Result<Provider> {
  const provider = providerStore.getProvider(providerId);
  if (provider === undefined) {
    return err(`Provider not found: ${providerId}`);
  }
  return { kind: "Ok", value: provider };
}

export async function apiAddProvider(
  _sdk: SDK,
  input: CreateProvider,
): Promise<Result<Provider>> {
  try {
    const provider = await providerStore.addProvider(input);
    return { kind: "Ok", value: provider };
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export async function apiUpdateProvider(
  _sdk: SDK,
  providerId: string,
  updates: UpdateProvider,
): Promise<Result<Provider>> {
  try {
    const provider = await providerStore.updateProvider(providerId, updates);
    return { kind: "Ok", value: provider };
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export async function apiDeleteProvider(
  _sdk: SDK,
  providerId: string,
): Promise<Result<void>> {
  try {
    await providerStore.deleteProvider(providerId);
    return { kind: "Ok", value: undefined };
  } catch (e) {
    return err(getErrorMessage(e));
  }
}
