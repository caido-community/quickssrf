import type { SDK } from "caido:plugin";
import type {
  GenerateUrlResult,
  Interaction,
  InteractshStartOptions,
} from "shared";

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
}

interface ServerClient {
  client: InteractshClient;
  serverUrl: string;
}

export class InteractshStore {
  private static _instance?: InteractshStore;
  private clients: Map<string, ServerClient> = new Map();
  private interactions: Interaction[] = [];
  private activeUrls: ActiveUrl[] = [];
  private sdk: SDK;
  private isStarted = false;
  private interactionCounter = 0;
  private currentOptions: InteractshStartOptions | undefined;

  private constructor(sdk: SDK) {
    this.sdk = sdk;
  }

  static get(sdk: SDK): InteractshStore {
    if (!InteractshStore._instance) {
      InteractshStore._instance = new InteractshStore(sdk);
    }
    return InteractshStore._instance;
  }

  private parseInteraction(json: Record<string, unknown>): Interaction {
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
        const parsed = this.parseInteraction(interaction);

        // Check if this interaction's URL is tracked and active
        const fullId = parsed.fullId;
        const matchingUrl = this.activeUrls.find(
          (u) => fullId.startsWith(u.uniqueId) || u.uniqueId === fullId,
        );

        // Only add interaction if URL is found AND is active
        if (matchingUrl && matchingUrl.isActive) {
          this.interactions.push(parsed);
          this.sdk.console.log(
            `New interaction received: ${parsed.protocol}`,
          );
        } else if (matchingUrl && !matchingUrl.isActive) {
          this.sdk.console.log(
            `Interaction ignored (URL disabled): ${parsed.fullId}`,
          );
        } else {
          this.sdk.console.log(
            `Interaction ignored (URL not tracked): ${parsed.fullId}`,
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

  async generateUrl(serverUrl: string): Promise<GenerateUrlResult> {
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
    });

    return result;
  }

  getInteractions(): Interaction[] {
    return [...this.interactions];
  }

  getNewInteractions(lastIndex: number): Interaction[] {
    return this.interactions.slice(lastIndex);
  }

  async poll(): Promise<void> {
    if (!this.isStarted) {
      throw new Error("Interactsh store not started");
    }

    // Poll all clients
    for (const [serverUrl, { client }] of this.clients) {
      try {
        await client.poll();
      } catch (error) {
        this.sdk.console.error(`Failed to poll ${serverUrl}: ${error}`);
      }
    }
  }

  clearInteractions(): void {
    this.interactions = [];
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
      this.sdk.console.log(`URL ${uniqueId} removed from tracking`);
      return true;
    }
    return false;
  }

  clearUrls(): void {
    this.activeUrls = [];
    this.sdk.console.log("All tracked URLs cleared");
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
}
