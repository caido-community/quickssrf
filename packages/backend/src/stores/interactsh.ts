import * as fs from "fs";
import * as path from "path";

import type { SDK } from "caido:plugin";
import type {
  GenerateUrlResult,
  Interaction,
  InteractshStartOptions,
} from "shared";

import {
  emitDataChanged,
  emitFilterChanged,
  emitFilterEnabledChanged,
  emitRowSelected,
  emitUrlGenerated,
  emitUrlsChanged,
} from "../index";
import {
  createInteractshClient,
  type InteractshClient,
} from "../services/interactsh";

import { SessionStore } from "./sessionStore";

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
  filterEnabled: boolean;
}

export class InteractshStore {
  private static _instance?: InteractshStore;
  private clients: Map<string, ServerClient> = new Map();
  private interactions: Interaction[] = [];
  private activeUrls: ActiveUrl[] = [];
  private filter = "";
  private filterEnabled = true;
  private selectedRowId: string | undefined;
  private sdk: SDK;
  private isStarted = false;
  private interactionCounter = 0;
  private currentOptions: InteractshStartOptions | undefined;
  private readonly dataPath: string;
  private sessionStore: SessionStore;

  private constructor(sdk: SDK) {
    this.sdk = sdk;
    this.dataPath = path.join(this.sdk.meta.path(), "data.json");
    this.sessionStore = SessionStore.get(sdk);
    this.loadPersistedData();
  }

  /**
   * Handle session expiration for a client
   * Called when the interactsh server returns 400 (session no longer valid)
   */
  private handleSessionExpired = async (serverUrl: string): Promise<void> => {
    this.sdk.console.log(`Cleaning up expired session for ${serverUrl}`);

    // Remove client from map
    this.clients.delete(serverUrl);

    // Remove from SQLite persistence
    await this.sessionStore.deleteClientSession(serverUrl);

    this.sdk.console.log(`Expired session cleaned up for ${serverUrl}`);
  };

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
      this.filterEnabled = parsed.filterEnabled !== false; // Default to true
      this.sdk.console.log(
        `Loaded persisted data: ${this.interactions.length} interactions, ${this.activeUrls.length} URLs`,
      );
    } catch {
      // File doesn't exist yet or is invalid - start with empty data
      this.interactions = [];
      this.activeUrls = [];
      this.interactionCounter = 0;
      this.filter = "";
      this.filterEnabled = true;
    }
  }

  private savePersistedData(notify = true): void {
    try {
      const persistData: PersistedData = {
        interactions: this.interactions,
        activeUrls: this.activeUrls,
        interactionCounter: this.interactionCounter,
        filter: this.filter,
        filterEnabled: this.filterEnabled,
      };
      fs.writeFileSync(this.dataPath, JSON.stringify(persistData, null, 2));
      if (notify) {
        emitDataChanged();
      }
    } catch (error) {
      this.sdk.console.error(`Failed to save persisted data: ${error}`);
    }
  }

  private parseInteraction(
    json: Record<string, unknown>,
    tag?: string,
    serverUrl?: string,
  ): Interaction {
    const toString = (value: unknown): string => {
      if (typeof value === "string") {
        return value;
      }
      if (value === undefined || value === null) {
        return "";
      }
      if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
      }
      // For objects/arrays, use JSON.stringify to get meaningful output
      if (typeof value === "object") {
        try {
          return JSON.stringify(value);
        } catch {
          return "";
        }
      }
      return "";
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
    this.isStarted = true;

    // Load or generate RSA keys
    const keysLoaded = await this.sessionStore.loadOrGenerateRSAKeys();

    // If we have persisted keys, try to restore sessions
    if (keysLoaded) {
      await this.restoreSessions();
    }

    this.sdk.console.log("Interactsh store initialized");
    return true;
  }

  /**
   * Restore client sessions from persistence
   */
  private async restoreSessions(): Promise<void> {
    const sessions = await this.sessionStore.loadClientSessions();
    if (sessions.length === 0) {
      this.sdk.console.log("No sessions to restore");
      return;
    }

    this.sdk.console.log(`Restoring ${sessions.length} session(s)...`);

    for (const session of sessions) {
      try {
        const client = createInteractshClient(this.sdk);
        await client.start(
          {
            serverURL: session.serverUrl,
            keepAliveInterval: this.currentOptions?.pollingInterval,
            sessionInfo: {
              serverURL: session.serverUrl,
              correlationID: session.correlationId,
              secretKey: session.secretKey,
              token: session.token || "",
            },
            onSessionExpired: this.handleSessionExpired,
          },
          (interaction: Record<string, unknown>) => {
            this.handleInteraction(interaction, session.serverUrl);
          },
        );

        this.clients.set(session.serverUrl, {
          client,
          serverUrl: session.serverUrl,
        });
        this.sdk.console.log(`Session restored for ${session.serverUrl}`);
      } catch (error) {
        this.sdk.console.error(
          `Failed to restore session for ${session.serverUrl}: ${error}`,
        );
        // Remove failed session from persistence
        await this.sessionStore.deleteClientSession(session.serverUrl);
      }
    }
  }

  /**
   * Handle incoming interaction from any client
   */
  private handleInteraction(
    interaction: Record<string, unknown>,
    serverUrl: string,
  ): void {
    const rawFullId = interaction["full-id"];
    const fullId = typeof rawFullId === "string" ? rawFullId : "";
    const matchingUrl = this.activeUrls.find(
      (u) => fullId.startsWith(u.uniqueId) || u.uniqueId === fullId,
    );

    if (matchingUrl && matchingUrl.isActive) {
      const parsed = this.parseInteraction(
        interaction,
        matchingUrl.tag,
        matchingUrl.serverUrl,
      );
      this.interactions.push(parsed);
      this.savePersistedData(false);
      // Emit event to notify frontend of new interaction
      emitDataChanged();
      this.sdk.console.log(
        `New interaction received: ${parsed.protocol}${parsed.tag ? ` [${parsed.tag}]` : ""}`,
      );
    } else if (matchingUrl && !matchingUrl.isActive) {
      this.sdk.console.log(`Interaction ignored (URL disabled): ${fullId}`);
    } else {
      this.sdk.console.log(`Interaction ignored (URL not tracked): ${fullId}`);
    }
  }

  private async getOrCreateClient(
    serverUrl: string,
  ): Promise<InteractshClient> {
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
        onSessionExpired: this.handleSessionExpired,
      },
      (interaction: Record<string, unknown>) => {
        this.handleInteraction(interaction, serverUrl);
      },
    );

    this.clients.set(serverUrl, { client, serverUrl });
    this.sdk.console.log(`Created client for server: ${serverUrl}`);

    // Save session credentials for persistence
    const credentials = client.getSessionCredentials();
    if (credentials) {
      await this.sessionStore.saveClientSession(credentials);
    }
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
          this.sdk.console.error(
            `Failed to stop client for ${serverUrl}: ${error}`,
          );
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

  async generateUrl(
    serverUrl: string,
    tag?: string,
  ): Promise<GenerateUrlResult> {
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
    const expiredServers: string[] = [];

    // Poll all clients
    for (const [serverUrl, { client }] of this.clients) {
      try {
        await client.poll();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        // SESSION_EXPIRED means server rejected, "Client is not polling" means client already stopped
        if (
          errorMessage.includes("SESSION_EXPIRED") ||
          errorMessage.includes("Client is not polling")
        ) {
          this.sdk.console.log(
            `Session expired or client stopped for ${serverUrl} - removing client`,
          );
          expiredServers.push(serverUrl);
        } else {
          this.sdk.console.error(`Failed to poll ${serverUrl}: ${error}`);
        }
      }
    }

    // Remove expired clients and their persisted sessions
    for (const serverUrl of expiredServers) {
      this.clients.delete(serverUrl);
      await this.sessionStore.deleteClientSession(serverUrl);
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
    this.interactions = this.interactions.filter(
      (i) => !idsSet.has(i.uniqueId),
    );
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
      emitUrlsChanged();
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
      emitUrlsChanged();
      return true;
    }
    return false;
  }

  clearUrls(): void {
    this.activeUrls = [];
    this.savePersistedData();
    this.sdk.console.log("All tracked URLs cleared");
    emitUrlsChanged();
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
        this.sdk.console.error(
          `Failed to initialize client for ${serverUrl}: ${error}`,
        );
      }
    });

    await Promise.all(promises);
    this.sdk.console.log(
      `Initialized ${initialized}/${serverUrls.length} clients`,
    );
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

  // Filter enabled management
  setFilterEnabled(enabled: boolean): void {
    if (this.filterEnabled !== enabled) {
      this.filterEnabled = enabled;
      this.savePersistedData(false);
      emitFilterEnabledChanged(enabled);
    }
  }

  getFilterEnabled(): boolean {
    return this.filterEnabled;
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

  // Selected row management (for cross-tab sync)
  setSelectedRowId(uniqueId: string | undefined): void {
    if (this.selectedRowId !== uniqueId) {
      this.selectedRowId = uniqueId;
      emitRowSelected(uniqueId);
    }
  }

  getSelectedRowId(): string | undefined {
    return this.selectedRowId;
  }
}
