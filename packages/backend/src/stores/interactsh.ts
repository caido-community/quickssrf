import type { SDK } from "caido:plugin";
import type { GenerateUrlResult, Interaction, InteractshStartOptions } from "shared";

import {
  createInteractshClient,
  type InteractshClient,
} from "../services/interactsh";

export class InteractshStore {
  private static _instance?: InteractshStore;
  private client: InteractshClient | undefined;
  private interactions: Interaction[] = [];
  private sdk: SDK;
  private isStarted = false;

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

    return {
      protocol: toString(json.protocol ?? "unknown"),
      uniqueId: toString(json["unique-id"] ?? ""),
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
        },
        (interaction: Record<string, unknown>) => {
          const parsed = this.parseInteraction(interaction);
          this.interactions.push(parsed);
          this.sdk.console.log(`New interaction received: ${parsed.protocol}`);
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

    return this.client.generateUrl();
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
}
