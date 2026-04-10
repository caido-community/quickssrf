import { randomUUID } from "crypto";
import path from "path";

import {
  type CreateProvider,
  CreateProviderSchema,
  DEFAULT_PROVIDERS,
  type Provider,
  type UpdateProvider,
  UpdateProviderSchema,
} from "shared";

import { ProviderNotFoundError } from "../errors";
import { requireSDK } from "../sdk";

import { getBasePath, readJson, writeJson } from "./baseStorage";

class ProviderStoreClass {
  private data: Provider[] = [];

  private getFilePath(): string {
    return path.join(getBasePath(), "providers.json");
  }

  async initialize(): Promise<void> {
    const loaded = await readJson<Provider[]>(this.getFilePath());
    if (loaded !== undefined) {
      this.data = loaded;
    } else {
      this.data = DEFAULT_PROVIDERS.map((p) => ({ ...p, id: randomUUID() }));
      await this.save();
    }
  }

  private async save(): Promise<void> {
    await writeJson(this.getFilePath(), this.data);
  }

  getProviders(): Provider[] {
    return [...this.data];
  }

  getProvider(id: string): Provider | undefined {
    return this.data.find((p) => p.id === id);
  }

  getDefaultProvider(): Provider | undefined {
    return this.data.find((p) => p.enabled);
  }

  async addProvider(input: CreateProvider): Promise<Provider> {
    const result = CreateProviderSchema.safeParse(input);
    if (!result.success) {
      throw new Error(`Invalid provider: ${result.error.message}`);
    }

    const provider: Provider = { ...result.data, id: randomUUID() };
    this.data.push(provider);
    await this.save();

    const sdk = requireSDK();
    sdk.api.send("provider:created", provider);
    return provider;
  }

  async updateProvider(id: string, updates: UpdateProvider): Promise<Provider> {
    const index = this.data.findIndex((p) => p.id === id);
    if (index === -1) throw new ProviderNotFoundError(id);

    const result = UpdateProviderSchema.safeParse(updates);
    if (!result.success) {
      throw new Error(`Invalid provider update: ${result.error.message}`);
    }

    const current = this.data[index]!;
    const updated: Provider = { ...current, ...result.data };

    if (current.enabled && updated.enabled === false) {
      const enabledCount = this.data.filter((p) => p.enabled).length;
      if (enabledCount <= 1) {
        throw new Error("Cannot disable the last enabled provider");
      }
    }

    this.data[index] = updated;
    await this.save();

    const sdk = requireSDK();
    sdk.api.send("provider:updated", updated);
    return updated;
  }

  async deleteProvider(id: string): Promise<void> {
    const index = this.data.findIndex((p) => p.id === id);
    if (index === -1) throw new ProviderNotFoundError(id);
    if (this.data.length === 1) {
      throw new Error("Cannot delete the last provider");
    }

    this.data.splice(index, 1);
    await this.save();

    const sdk = requireSDK();
    sdk.api.send("provider:deleted", id);
  }
}

export const providerStore = new ProviderStoreClass();
