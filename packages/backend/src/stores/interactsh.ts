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
}

export class InteractshStore {
  private static _instance?: InteractshStore;
  private client: InteractshClient | undefined;
  private interactions: Interaction[] = [];
  private activeUrls: ActiveUrl[] = [];
  private sdk: SDK;
  private isStarted = false;
  private interactionCounter = 0;

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
    if (this.isStarted && this.client) {
      this.sdk.console.log("Interactsh client already started");
      return true;
    }

    try {
      this.client = createInteractshClient(this.sdk);
      this.interactions = [];

      await this.client.start(
        {
          serverURL: options.serverURL,
          token: options.token,
          keepAliveInterval: options.pollingInterval,
          correlationIdLength: options.correlationIdLength,
          correlationIdNonceLength: options.correlationIdNonceLength,
        },
        (interaction: Record<string, unknown>) => {
          const parsed = this.parseInteraction(interaction);

          // Check if this interaction's URL is still active
          const fullId = parsed.fullId;
          const matchingUrl = this.activeUrls.find(
            (u) => fullId.startsWith(u.uniqueId) || u.uniqueId === fullId,
          );

          // Only add interaction if URL is active or not tracked (for backwards compatibility)
          if (!matchingUrl || matchingUrl.isActive) {
            this.interactions.push(parsed);
            this.sdk.console.log(
              `New interaction received: ${parsed.protocol}`,
            );
          } else {
            this.sdk.console.log(
              `Interaction ignored (URL disabled): ${parsed.fullId}`,
            );
          }
        },
      );

      this.isStarted = true;
      this.sdk.console.log("Interactsh client started successfully");
      return true;
    } catch (error) {
      this.sdk.console.error(`Failed to start Interactsh client: ${error}`);
      this.client = undefined;
      this.isStarted = false;
      throw error;
    }
  }

  async stop(): Promise<boolean> {
    if (!this.client || !this.isStarted) {
      this.sdk.console.log("Interactsh client not started");
      return true;
    }

    try {
      await this.client.stop();
      this.client = undefined;
      this.isStarted = false;
      this.sdk.console.log("Interactsh client stopped successfully");
      return true;
    } catch (error) {
      this.sdk.console.error(`Failed to stop Interactsh client: ${error}`);
      throw error;
    }
  }

  generateUrl(): GenerateUrlResult {
    if (!this.client || !this.isStarted) {
      throw new Error("Interactsh client not started");
    }

    const result = this.client.generateUrl();

    // Track this URL as active
    this.activeUrls.push({
      url: result.url,
      uniqueId: result.uniqueId,
      createdAt: new Date().toISOString(),
      isActive: true,
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
    if (!this.client || !this.isStarted) {
      throw new Error("Interactsh client not started");
    }

    await this.client.poll();
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
}
