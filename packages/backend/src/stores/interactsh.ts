import * as fs from "fs";
import * as path from "path";

import type { SDK } from "caido:plugin";
import type {
  GenerateUrlResult,
  Interaction,
  InteractshStartOptions,
} from "shared";

import { emitDataChanged, emitFilterChanged, emitUrlGenerated } from "../index";
import {
  createInteractshClient,
  type InteractshClient,
} from "../services/interactsh";

export interface ActiveUrl {
  url: string;
  uniqueId: string;
  createdAt: string;
  isActive: boolean;
  serverUrl: string;
  tag?: string;
}

interface ServerClient {
  client: InteractshClient;
  serverUrl: string;
}

interface PersistedData {
  interactions: Interaction[];
  activeUrls: ActiveUrl[];
  interactionCounter: number;
  filter: string;
}

export class InteractshStore {
  private static _instance?: InteractshStore;
  private clients: Map<string, ServerClient> = new Map();
  private interactions: Interaction[] = [];
  private activeUrls: ActiveUrl[] = [];
  private filter = "";
  private sdk: SDK;
  private isStarted = false;
  private interactionCounter = 0;
  private currentOptions: InteractshStartOptions | undefined;
  private readonly dataPath: string;

  private constructor(sdk: SDK) {
    this.sdk = sdk;
    this.dataPath = path.join(this.sdk.meta.path(), "data.json");
    this.loadPersistedData();
  }

  static get(sdk: SDK): InteractshStore {
    if (!InteractshStore._instance) {
      InteractshStore._instance = new InteractshStore(sdk);
    }
    return InteractshStore._instance;
  }

  private loadPersistedData(): void {
    try {
      const fileData = fs.readFileSync(this.dataPath, { encoding: "utf-8" });
      const parsed: PersistedData = JSON.parse(fileData);
      this.interactions = parsed.interactions || [];
      this.activeUrls = parsed.activeUrls || [];
      this.interactionCounter = parsed.interactionCounter || 0;
      this.filter = parsed.filter || "";
      this.sdk.console.log(
        `Loaded persisted data: ${this.interactions.length} interactions, ${this.activeUrls.length} URLs`,
      );
    } catch {
      // File doesn't exist yet or is invalid - start with empty data
      this.interactions = [];
      this.activeUrls = [];
      this.interactionCounter = 0;
      this.filter = "";
    }
  }

  private savePersistedData(notify = true): void {
    try {
      const persistData: PersistedData = {
        interactions: this.interactions,
        activeUrls: this.activeUrls,
        interactionCounter: this.interactionCounter,
        filter: this.filter,
      };
      fs.writeFileSync(this.dataPath, JSON.stringify(persistData, null, 2));
      if (notify) {
        emitDataChanged();
      }
    } catch (error) {
      this.sdk.console.error(`Failed to save persisted data: ${error}`);
    }
  }

  private parseInteraction(json: Record<string, unknown>, tag?: string, serverUrl?: string): Interaction {
    const toString = (value: unknown): string => {
      if (typeof value === "string") {
        return value;
      }
      return String(value ?? "");
    };

    // Generate a truly unique ID for each interaction
    this.interactionCounter++;
    const uniqueId = `int_${Date.now()}_${this.interactionCounter}`;

    return {
      protocol: toString(json.protocol ?? "unknown"),
      uniqueId,
      fullId: toString(json["full-id"] ?? ""),
      qType: toString(json["q-type"] ?? ""),
      rawRequest: toString(json["raw-request"] ?? ""),
      rawResponse: toString(json["raw-response"] ?? ""),
      remoteAddress: toString(json["remote-address"] ?? ""),
      timestamp: toString(json.timestamp ?? new Date().toISOString()),
      tag,
      serverUrl,
    };
  }

  async start(options: InteractshStartOptions): Promise<boolean> {
    if (this.isStarted) {
      this.sdk.console.log("Interactsh store already started");
      return true;
    }

    this.currentOptions = options;
    this.interactions = [];
    this.isStarted = true;
    this.sdk.console.log("Interactsh store initialized");
    return true;
  }

  private async getOrCreateClient(serverUrl: string): Promise<InteractshClient> {
    const existing = this.clients.get(serverUrl);
    if (existing) {
      return existing.client;
    }

    if (!this.currentOptions) {
      throw new Error("Store not initialized");
    }

    const client = createInteractshClient(this.sdk);
    await client.start(
      {
        serverURL: serverUrl,
        token: this.currentOptions.token,
        keepAliveInterval: this.currentOptions.pollingInterval,
        correlationIdLength: this.currentOptions.correlationIdLength,
        correlationIdNonceLength: this.currentOptions.correlationIdNonceLength,
      },
      (interaction: Record<string, unknown>) => {
        // Check if this interaction's URL is tracked and active
        const fullId = String(interaction["full-id"] ?? "");
        const matchingUrl = this.activeUrls.find(
          (u) => fullId.startsWith(u.uniqueId) || u.uniqueId === fullId,
        );

        // Only add interaction if URL is found AND is active
        if (matchingUrl && matchingUrl.isActive) {
          // Pass the tag and serverUrl from the matching URL to the interaction
          const parsed = this.parseInteraction(interaction, matchingUrl.tag, matchingUrl.serverUrl);
          this.interactions.push(parsed);
          // Don't emit event for new interactions - polling handles this
          this.savePersistedData(false);
          this.sdk.console.log(
            `New interaction received: ${parsed.protocol}${parsed.tag ? ` [${parsed.tag}]` : ""}`,
          );
        } else if (matchingUrl && !matchingUrl.isActive) {
          this.sdk.console.log(
            `Interaction ignored (URL disabled): ${fullId}`,
          );
        } else {
          this.sdk.console.log(
            `Interaction ignored (URL not tracked): ${fullId}`,
          );
        }
      },
    );

    this.clients.set(serverUrl, { client, serverUrl });
    this.sdk.console.log(`Created client for server: ${serverUrl}`);
    return client;
  }

  async stop(): Promise<boolean> {
    if (!this.isStarted) {
      this.sdk.console.log("Interactsh store not started");
      return true;
    }

    try {
      // Stop all clients
      for (const [serverUrl, { client }] of this.clients) {
        try {
          await client.stop();
          this.sdk.console.log(`Stopped client for server: ${serverUrl}`);
        } catch (error) {
          this.sdk.console.error(`Failed to stop client for ${serverUrl}: ${error}`);
        }
      }
      this.clients.clear();
      this.isStarted = false;
      this.currentOptions = undefined;
      this.sdk.console.log("All Interactsh clients stopped successfully");
      return true;
    } catch (error) {
      this.sdk.console.error(`Failed to stop Interactsh clients: ${error}`);
      throw error;
    }
  }

  async generateUrl(serverUrl: string, tag?: string): Promise<GenerateUrlResult> {
    if (!this.isStarted) {
      throw new Error("Interactsh store not started");
    }

    const client = await this.getOrCreateClient(serverUrl);
    const result = client.generateUrl();

    // Track this URL as active
    this.activeUrls.push({
      url: result.url,
      uniqueId: result.uniqueId,
      createdAt: new Date().toISOString(),
      isActive: true,
      serverUrl,
      tag,
    });

    this.savePersistedData(false);
    // Emit URL generated event to sync across tabs
    emitUrlGenerated(result.url);
    return result;
  }

  getInteractions(): Interaction[] {
    return [...this.interactions];
  }

  getNewInteractions(lastIndex: number): Interaction[] {
    return this.interactions.slice(lastIndex);
  }

  async poll(notifyOthers = false): Promise<void> {
    if (!this.isStarted) {
      throw new Error("Interactsh store not started");
    }

    const countBefore = this.interactions.length;

    // Poll all clients
    for (const [serverUrl, { client }] of this.clients) {
      try {
        await client.poll();
      } catch (error) {
        this.sdk.console.error(`Failed to poll ${serverUrl}: ${error}`);
      }
    }

    // If notifyOthers is true and we got new interactions, emit event
    if (notifyOthers && this.interactions.length > countBefore) {
      emitDataChanged();
    }
  }

  clearInteractions(): void {
    this.interactions = [];
    this.savePersistedData();
  }

  deleteInteraction(uniqueId: string): boolean {
    const index = this.interactions.findIndex((i) => i.uniqueId === uniqueId);
    if (index !== -1) {
      this.interactions.splice(index, 1);
      this.savePersistedData();
      return true;
    }
    return false;
  }

  deleteInteractions(uniqueIds: string[]): number {
    const idsSet = new Set(uniqueIds);
    const initialLength = this.interactions.length;
    this.interactions = this.interactions.filter((i) => !idsSet.has(i.uniqueId));
    const deletedCount = initialLength - this.interactions.length;
    if (deletedCount > 0) {
      this.savePersistedData();
    }
    return deletedCount;
  }

  getStatus(): { isStarted: boolean; interactionCount: number } {
    return {
      isStarted: this.isStarted,
      interactionCount: this.interactions.length,
    };
  }

  // URL Management methods
  getActiveUrls(): ActiveUrl[] {
    return [...this.activeUrls];
  }

  setUrlActive(uniqueId: string, isActive: boolean): boolean {
    const url = this.activeUrls.find((u) => u.uniqueId === uniqueId);
    if (url) {
      url.isActive = isActive;
      this.savePersistedData();
      this.sdk.console.log(
        `URL ${uniqueId} set to ${isActive ? "active" : "inactive"}`,
      );
      return true;
    }
    return false;
  }

  removeUrl(uniqueId: string): boolean {
    const index = this.activeUrls.findIndex((u) => u.uniqueId === uniqueId);
    if (index !== -1) {
      this.activeUrls.splice(index, 1);
      this.savePersistedData();
      this.sdk.console.log(`URL ${uniqueId} removed from tracking`);
      return true;
    }
    return false;
  }

  clearUrls(): void {
    this.activeUrls = [];
    this.savePersistedData();
    this.sdk.console.log("All tracked URLs cleared");
  }

  // Clear all persisted data (interactions, URLs, counter)
  clearAllData(): void {
    this.interactions = [];
    this.activeUrls = [];
    this.interactionCounter = 0;
    this.savePersistedData();
    this.sdk.console.log("All data cleared");
  }

  // Pre-initialize clients for multiple servers (for random mode)
  async initializeClients(serverUrls: string[]): Promise<number> {
    if (!this.isStarted) {
      throw new Error("Interactsh store not started");
    }

    let initialized = 0;
    const promises = serverUrls.map(async (serverUrl) => {
      try {
        await this.getOrCreateClient(serverUrl);
        initialized++;
      } catch (error) {
        this.sdk.console.error(`Failed to initialize client for ${serverUrl}: ${error}`);
      }
    });

    await Promise.all(promises);
    this.sdk.console.log(`Initialized ${initialized}/${serverUrls.length} clients`);
    return initialized;
  }

  // Get count of initialized clients
  getClientCount(): number {
    return this.clients.size;
  }

  // Filter management
  setFilter(filter: string): void {
    if (this.filter !== filter) {
      this.filter = filter;
      this.savePersistedData(false);
      emitFilterChanged(filter);
    }
  }

  getFilter(): string {
    return this.filter;
  }

  // Update tag for an interaction
  setInteractionTag(uniqueId: string, tag: string | undefined): boolean {
    const interaction = this.interactions.find((i) => i.uniqueId === uniqueId);
    if (interaction) {
      interaction.tag = tag;
      this.savePersistedData();
      return true;
    }
    return false;
  }
}
