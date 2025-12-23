/**
 * Session persistence store using SQLite
 * Handles storage of RSA keys and client sessions for resumption after restart
 */

import type { SDK } from "caido:plugin";

import {
  exportRSAKeyPair,
  importRSAKeyPair,
  initializeRSAKeys,
  type SerializedRSAKeyPair,
} from "../services/crypto";

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
 */
export class SessionStore {
  private static _instance?: SessionStore;
  private sdk: SDK;
  private initialized = false;

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
   * Initialize the database tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const db = await this.sdk.meta.db();

    // Create RSA keys table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS rsa_keys (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        key_data TEXT NOT NULL
      );
    `);

    // Create client sessions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS client_sessions (
        server_url TEXT PRIMARY KEY,
        correlation_id TEXT NOT NULL,
        secret_key TEXT NOT NULL,
        token TEXT
      );
    `);

    this.initialized = true;
    this.sdk.console.log("Session store initialized");
  }

  /**
   * Load or generate RSA keys
   * Returns true if keys were loaded from persistence, false if newly generated
   */
  async loadOrGenerateRSAKeys(): Promise<boolean> {
    await this.initialize();

    const db = await this.sdk.meta.db();
    const stmt = await db.prepare("SELECT key_data FROM rsa_keys WHERE id = 1");
    const row = (await stmt.get()) as { key_data: string } | undefined;

    if (row) {
      try {
        const serialized: SerializedRSAKeyPair = JSON.parse(row.key_data);
        importRSAKeyPair(serialized);
        this.sdk.console.log("RSA keys loaded from persistence");
        return true;
      } catch (error) {
        this.sdk.console.error(`Failed to load RSA keys: ${error}`);
      }
    }

    // Generate new keys
    initializeRSAKeys();
    await this.saveRSAKeys();
    this.sdk.console.log("New RSA keys generated and saved");
    return false;
  }

  /**
   * Save current RSA keys to database
   */
  async saveRSAKeys(): Promise<void> {
    const serialized = exportRSAKeyPair();
    if (!serialized) {
      return;
    }

    const db = await this.sdk.meta.db();
    const stmt = await db.prepare(
      "INSERT OR REPLACE INTO rsa_keys (id, key_data) VALUES (1, ?)",
    );
    await stmt.run(JSON.stringify(serialized));
  }

  /**
   * Save a client session
   */
  async saveClientSession(session: ClientSession): Promise<void> {
    await this.initialize();

    const db = await this.sdk.meta.db();
    const stmt = await db.prepare(`
      INSERT OR REPLACE INTO client_sessions (server_url, correlation_id, secret_key, token)
      VALUES (?, ?, ?, ?)
    `);
    await stmt.run(
      session.serverUrl,
      session.correlationId,
      session.secretKey,
      session.token || null,
    );
    this.sdk.console.log(`Session saved for ${session.serverUrl}`);
  }

  /**
   * Load all client sessions
   */
  async loadClientSessions(): Promise<ClientSession[]> {
    await this.initialize();

    const db = await this.sdk.meta.db();
    const stmt = await db.prepare("SELECT * FROM client_sessions");
    const rows = (await stmt.all()) as Array<{
      server_url: string;
      correlation_id: string;
      secret_key: string;
      token: string | null;
    }>;

    return rows.map((row) => ({
      serverUrl: row.server_url,
      correlationId: row.correlation_id,
      secretKey: row.secret_key,
      token: row.token || undefined,
    }));
  }

  /**
   * Delete a client session
   */
  async deleteClientSession(serverUrl: string): Promise<void> {
    await this.initialize();

    const db = await this.sdk.meta.db();
    const stmt = await db.prepare(
      "DELETE FROM client_sessions WHERE server_url = ?",
    );
    await stmt.run(serverUrl);
    this.sdk.console.log(`Session deleted for ${serverUrl}`);
  }

  /**
   * Delete all client sessions
   */
  async clearAllSessions(): Promise<void> {
    await this.initialize();

    const db = await this.sdk.meta.db();
    await db.exec("DELETE FROM client_sessions");
    this.sdk.console.log("All sessions cleared");
  }
}
