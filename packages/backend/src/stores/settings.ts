import crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

import type { SDK } from "caido:plugin";
import { type Settings } from "shared";

const defaultSettings = {
  serverURL: "https://oast.site",
  token: crypto.randomUUID(),
  pollingInterval: 30_000,
  correlationIdLength: 20,
  correlationIdNonceLength: 13,
};

export class SettingsStore {
  private static _instance?: SettingsStore;
  private settings: Settings;
  private readonly configPath: string;
  private sdk: SDK;

  private constructor(sdk: SDK) {
    this.sdk = sdk;
    this.configPath = path.join(this.sdk.meta.path(), "config.json");
    this.settings = this.loadSettings();
  }

  static get(sdk: SDK): SettingsStore {
    if (!SettingsStore._instance) {
      SettingsStore._instance = new SettingsStore(sdk);
    }
    return SettingsStore._instance;
  }

  private loadSettings(): Settings {
    try {
      const data = fs.readFileSync(this.configPath, { encoding: "utf-8" });
      return JSON.parse(data);
    } catch (error) {
      this.settings = {
        ...defaultSettings,
      };

      this.writeDefaultSettings();
      return this.settings;
    }
  }

  private writeDefaultSettings() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2));
  }

  private saveSettings() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      this.sdk.console.error(`Failed to save settings: ${error}`);
    }
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  updateSettings(sdk: SDK, newSettings: Partial<Settings>): Settings {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    this.saveSettings();
    return this.getSettings();
  }

  resetSettings(): Settings {
    this.settings = {
      ...defaultSettings,
    };
    this.saveSettings();
    return this.getSettings();
  }
}
