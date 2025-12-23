/**
 * Session persistence store using Caido's secure environment variables
 * Handles storage of RSA keys and client sessions for resumption after restart
 * Sensitive data is encrypted on disk using sdk.env.setVar with secret: true
 */

import type { SDK } from "caido:plugin";

import {
  exportRSAKeyPair,
  importRSAKeyPair,
  initializeRSAKeys,
  type SerializedRSAKeyPair,
} from "../services/crypto";

// Environment variable names for secure storage
const ENV_RSA_KEYS = "QUICKSSRF_RSA_KEYS";
const ENV_CLIENT_SESSIONS = "QUICKSSRF_CLIENT_SESSIONS";

/**
 * Client session data for persistence
 */
export interface ClientSession {
  serverUrl: string;
  correlationId: string;
  secretKey: string;
  token?: string;
}

/**
 * Session store for persisting interactsh client data
 * Uses Caido's secure environment variables (encrypted on disk)
 */
export class SessionStore {
  private static _instance?: SessionStore;
  private sdk: SDK;

  private constructor(sdk: SDK) {
    this.sdk = sdk;
  }

  static get(sdk: SDK): SessionStore {
    if (!SessionStore._instance) {
      SessionStore._instance = new SessionStore(sdk);
    }
    return SessionStore._instance;
  }

  /**
   * Load or generate RSA keys
   * Returns true if keys were loaded from persistence, false if newly generated
   */
  async loadOrGenerateRSAKeys(): Promise<boolean> {
    const storedKeys = this.sdk.env.getVar(ENV_RSA_KEYS);

    if (storedKeys) {
      try {
        const serialized: SerializedRSAKeyPair = JSON.parse(storedKeys);
        importRSAKeyPair(serialized);
        this.sdk.console.log("RSA keys loaded from secure storage");
        return true;
      } catch (error) {
        this.sdk.console.error(`Failed to load RSA keys: ${error}`);
      }
    }

    // Generate new keys
    initializeRSAKeys();
    await this.saveRSAKeys();
    this.sdk.console.log("New RSA keys generated and saved to secure storage");
    return false;
  }

  /**
   * Save current RSA keys to secure storage
   */
  async saveRSAKeys(): Promise<void> {
    const serialized = exportRSAKeyPair();
    if (!serialized) {
      return;
    }

    try {
      await this.sdk.env.setVar({
        name: ENV_RSA_KEYS,
        value: JSON.stringify(serialized),
        secret: true, // Encrypted on disk
        global: true,
      });
    } catch (error) {
      this.sdk.console.error(`Failed to save RSA keys: ${error}`);
    }
  }

  /**
   * Load all client sessions from secure storage
   */
  private loadSessionsFromEnv(): ClientSession[] {
    const storedSessions = this.sdk.env.getVar(ENV_CLIENT_SESSIONS);
    if (!storedSessions) {
      return [];
    }

    try {
      return JSON.parse(storedSessions) as ClientSession[];
    } catch {
      return [];
    }
  }

  /**
   * Save all client sessions to secure storage
   */
  private async saveSessionsToEnv(sessions: ClientSession[]): Promise<void> {
    try {
      await this.sdk.env.setVar({
        name: ENV_CLIENT_SESSIONS,
        value: JSON.stringify(sessions),
        secret: true, // Encrypted on disk
        global: true,
      });
    } catch (error) {
      this.sdk.console.error(`Failed to save sessions: ${error}`);
    }
  }

  /**
   * Save a client session
   */
  async saveClientSession(session: ClientSession): Promise<void> {
    const sessions = this.loadSessionsFromEnv();

    // Update existing or add new
    const existingIndex = sessions.findIndex(
      (s) => s.serverUrl === session.serverUrl,
    );
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    await this.saveSessionsToEnv(sessions);
    this.sdk.console.log(`Session saved for ${session.serverUrl}`);
  }

  /**
   * Load all client sessions
   */
  async loadClientSessions(): Promise<ClientSession[]> {
    return this.loadSessionsFromEnv();
  }

  /**
   * Delete a client session
   */
  async deleteClientSession(serverUrl: string): Promise<void> {
    const sessions = this.loadSessionsFromEnv();
    const filtered = sessions.filter((s) => s.serverUrl !== serverUrl);

    if (filtered.length !== sessions.length) {
      await this.saveSessionsToEnv(filtered);
      this.sdk.console.log(`Session deleted for ${serverUrl}`);
    }
  }

  /**
   * Delete all client sessions
   */
  async clearAllSessions(): Promise<void> {
    await this.saveSessionsToEnv([]);
    this.sdk.console.log("All sessions cleared");
  }
}
