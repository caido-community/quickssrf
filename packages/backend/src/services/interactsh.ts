import { Blob, fetch, type Response } from "caido:http";
import type { SDK } from "caido:plugin";

import {
  areKeysInitialized,
  decryptMessage,
  encodePublicKey,
  generateRandomString,
  initializeRSAKeys,
} from "./crypto";

/**
 * Enum representing the possible states of the Interactsh client
 */
enum State {
  Idle,
  Polling,
  Closed,
}

/**
 * Configuration options for the Interactsh client
 */
interface Options {
  serverURL: string;
  token: string;
  correlationIdLength?: number;
  correlationIdNonceLength?: number;
  sessionInfo?: SessionInfo;
  keepAliveInterval?: number;
}

/**
 * Session information for restoring a previous Interactsh session
 */
interface SessionInfo {
  serverURL: string;
  token: string;
  correlationID: string;
  secretKey: string;
}

/**
 * Interaction data from Interactsh server
 */
interface InteractionData {
  protocol: string;
  "unique-id": string;
  "full-id": string;
  "raw-request"?: string;
  "raw-response"?: string;
  "remote-address"?: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Simple URL parser since URL is not available in Caido backend
 */
function parseUrl(urlString: string): { host: string; origin: string } {
  // Extract protocol and host from URL string
  const protocolMatch = urlString.match(/^(https?:\/\/)/);
  const protocol = protocolMatch ? protocolMatch[1] : "https://";
  const withoutProtocol = urlString.replace(/^https?:\/\//, "");
  const hostMatch = withoutProtocol.match(/^([^/]+)/);
  const host = hostMatch ? hostMatch[1]! : withoutProtocol;
  return {
    host,
    origin: `${protocol}${host}`,
  };
}

/**
 * Construct a full URL from base and path
 */
function buildUrl(base: string, path: string): string {
  const { origin } = parseUrl(base);
  return `${origin}${path}`;
}

/**
 * Creates and returns an Interactsh client service for Caido backend
 */
export const createInteractshClient = (sdk: SDK) => {
  let state: State = State.Idle;
  let correlationID: string | undefined;
  let secretKey: string | undefined;
  let serverURLString: string | undefined;
  let serverHost: string | undefined;
  let token: string | undefined;
  let quitPollingFlag = false;
  let pollingInterval = 5000;
  let correlationIdNonceLength = 13;
  let interactionCallback: ((interaction: InteractionData) => void) | undefined;

  const defaultInteractionHandler = () => {};

  /**
   * Ensure RSA keys are initialized
   */
  const ensureKeysInitialized = (): void => {
    if (!areKeysInitialized()) {
      sdk.console.log("Initializing RSA keys...");
      initializeRSAKeys();
      sdk.console.log("RSA keys initialized");
    }
  };

  /**
   * HTTP request options
   */
  interface HttpRequestOptions {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }

  /**
   * Make an HTTP request using fetch
   */
  const httpRequest = async (
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<Response> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (token) {
      headers["Authorization"] = token;
    }

    return fetch(url, {
      method: options.method,
      body: options.body ? new Blob([options.body]) : undefined,
      headers,
    });
  };

  /**
   * Registers the client with the Interactsh server
   */
  const performRegistration = async (payload: object): Promise<void> => {
    if (!serverURLString) {
      throw new Error("Server URL is not defined");
    }

    const url = buildUrl(serverURLString, "/register");

    try {
      const response = await httpRequest(url, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.status === 200) {
        state = State.Idle;
        sdk.console.log("Successfully registered with Interactsh server");
      } else {
        const errorText = await response.text();
        throw new Error(`Registration failed: ${errorText}`);
      }
    } catch (error) {
      sdk.console.error(`Registration error: ${error}`);
      throw new Error(
        "Registration failed, please check your server URL and token",
      );
    }
  };

  /**
   * Fetches interactions from the Interactsh server
   */
  const getInteractions = async (
    callback: (interaction: InteractionData) => void,
  ): Promise<void> => {
    if (!correlationID || !secretKey || !serverURLString) {
      throw new Error("Missing required client configuration");
    }

    const url = buildUrl(
      serverURLString,
      `/poll?id=${correlationID}&secret=${secretKey}`,
    );

    try {
      const response = await httpRequest(url, { method: "GET" });

      if (response.status !== 200) {
        if (response.status === 401) {
          throw new Error("Couldn't authenticate to the server");
        }
        const errorText = await response.text();
        throw new Error(`Could not poll interactions: ${errorText}`);
      }

      const data = (await response.json()) as {
        data?: string[];
        aes_key?: string;
      };

      if (data?.data && Array.isArray(data.data) && data.aes_key) {
        for (const item of data.data) {
          try {
            const decryptedData = decryptMessage(data.aes_key, item);
            const interaction = JSON.parse(decryptedData) as InteractionData;
            callback(interaction);
          } catch (err) {
            sdk.console.error(`Failed to decrypt/parse interaction: ${err}`);
          }
        }
      }
    } catch (error) {
      sdk.console.error(`Error polling interactions: ${error}`);
      throw new Error("Error polling interactions");
    }
  };

  /**
   * Initializes the Interactsh client with the provided options
   */
  const initialize = async (
    options: Options,
    interactionCallbackParam?: (interaction: InteractionData) => void,
  ): Promise<void> => {
    ensureKeysInitialized();

    token = options.token;
    correlationID =
      options.sessionInfo?.correlationID ||
      generateRandomString(options.correlationIdLength || 20);
    secretKey =
      options.sessionInfo?.secretKey ||
      generateRandomString(options.correlationIdNonceLength || 13);

    serverURLString = options.serverURL;
    const parsed = parseUrl(options.serverURL);
    serverHost = parsed.host;

    correlationIdNonceLength = options.correlationIdNonceLength || 13;

    if (interactionCallbackParam) {
      interactionCallback = interactionCallbackParam;
    }

    if (options.sessionInfo) {
      const { token: sessionToken, serverURL: sessionServerURL } =
        options.sessionInfo;
      token = sessionToken;
      serverURLString = sessionServerURL;
      const parsedSession = parseUrl(sessionServerURL);
      serverHost = parsedSession.host;
    }

    const publicKey = encodePublicKey();
    await performRegistration({
      "public-key": publicKey,
      "secret-key": secretKey,
      "correlation-id": correlationID,
    });

    if (options.keepAliveInterval) {
      pollingInterval = options.keepAliveInterval;
      startPolling(interactionCallback || defaultInteractionHandler);
    }
  };

  /**
   * Starts polling the server for interactions
   */
  const startPolling = (
    callback: (interaction: InteractionData) => void,
  ): void => {
    if (state === State.Polling) {
      throw new Error("Client is already polling");
    }

    quitPollingFlag = false;
    state = State.Polling;

    const pollingLoop = async () => {
      while (!quitPollingFlag) {
        try {
          await getInteractions(callback);
        } catch (err) {
          sdk.console.error(`Polling error: ${err}`);
        }
        await new Promise((resolve) => setTimeout(resolve, pollingInterval));
      }
    };

    pollingLoop();
  };

  /**
   * Manually polls the server once for interactions
   */
  const poll = async (): Promise<void> => {
    if (state !== State.Polling) {
      throw new Error("Client is not polling");
    }

    await getInteractions(interactionCallback || defaultInteractionHandler);
  };

  /**
   * Stops the polling process
   */
  const stopPolling = (): void => {
    if (state !== State.Polling) {
      throw new Error("Client is not polling");
    }

    quitPollingFlag = true;
    state = State.Idle;
  };

  /**
   * Sets the polling interval in seconds
   */
  const setRefreshTimeSecond = (seconds: number): void => {
    if (seconds < 5 || seconds > 3600) {
      throw new Error(
        "The polling interval must be between 5 and 3600 seconds",
      );
    }
    pollingInterval = seconds * 1000;

    if (state === State.Polling) {
      stopPolling();
      startPolling(interactionCallback || defaultInteractionHandler);
    }
  };

  /**
   * Updates the polling interval in milliseconds
   */
  const updatePollingInterval = (ms: number): void => {
    const seconds = Math.floor(ms / 1000);
    setRefreshTimeSecond(seconds);
  };

  /**
   * Deregisters the client from the Interactsh server
   */
  const close = async (): Promise<void> => {
    if (state === State.Polling) {
      throw new Error("Client should stop polling before closing");
    }
    if (state === State.Closed) {
      throw new Error("Client is already closed");
    }

    if (!serverURLString) {
      throw new Error("Server URL is not defined");
    }

    const url = buildUrl(serverURLString, "/deregister");

    try {
      const response = await httpRequest(url, {
        method: "POST",
        body: JSON.stringify({
          correlationID: correlationID,
          secretKey: secretKey,
        }),
      });

      if (response.status !== 200) {
        const errorText = await response.text();
        throw new Error(`Could not deregister from server: ${errorText}`);
      }

      state = State.Closed;
      sdk.console.log("Successfully deregistered from Interactsh server");
    } catch (error) {
      sdk.console.error(`Failed to deregister: ${error}`);
      throw new Error("Could not deregister from server");
    }
  };

  /**
   * Starts the Interactsh client with the provided options
   */
  const start = async (
    options: Options,
    interactionCallbackParam?: (interaction: InteractionData) => void,
  ): Promise<void> => {
    await initialize(options, interactionCallbackParam);
  };

  /**
   * Stops polling and closes the client
   */
  const stop = async (): Promise<void> => {
    if (state === State.Polling) {
      stopPolling();
    }
    await close();
  };

  /**
   * Generates a unique URL for the current session
   */
  const generateUrl = (
    incrementNumber = 0,
  ): { url: string; uniqueId: string } => {
    if (state === State.Closed || !correlationID || !serverHost) {
      return { url: "", uniqueId: "" };
    }

    const randomId = generateRandomString(correlationIdNonceLength);
    const url = `https://${correlationID}${randomId}.${serverHost}`;
    const uniqueId = `${correlationID}${randomId}`;
    return { url, uniqueId };
  };

  /**
   * Get current state
   */
  const getState = (): State => state;

  /**
   * Get correlation ID
   */
  const getCorrelationID = (): string | undefined => correlationID;

  return {
    getState,
    getCorrelationID,
    start,
    generateUrl,
    poll,
    setRefreshTimeSecond,
    updatePollingInterval,
    stop,
    close,
  };
};

export type InteractshClient = ReturnType<typeof createInteractshClient>;
