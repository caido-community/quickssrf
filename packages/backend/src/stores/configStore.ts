import path from "path";

import {
  DEFAULT_CONFIG,
  type QuickSSRFConfig,
  UpdateConfigSchema,
} from "shared";

import { requireSDK } from "../sdk";

import { getBasePath, readJson, writeJson } from "./baseStorage";

class ConfigStoreClass {
  private data: QuickSSRFConfig = { ...DEFAULT_CONFIG };

  private getFilePath(): string {
    return path.join(getBasePath(), "config.json");
  }

  async initialize(): Promise<void> {
    const loaded = await readJson<QuickSSRFConfig>(this.getFilePath());
    if (loaded !== undefined) {
      this.data = { ...DEFAULT_CONFIG, ...loaded };
    } else {
      await writeJson(this.getFilePath(), this.data);
    }
  }

  getConfig(): QuickSSRFConfig {
    return { ...this.data };
  }

  async updateConfig(updates: Partial<QuickSSRFConfig>): Promise<void> {
    const result = UpdateConfigSchema.safeParse(updates);
    if (!result.success) {
      throw new Error(`Invalid config: ${result.error.message}`);
    }

    this.data = { ...this.data, ...result.data };
    await writeJson(this.getFilePath(), this.data);

    const sdk = requireSDK();
    sdk.api.send("config:updated", this.data);
  }
}

export const configStore = new ConfigStoreClass();
