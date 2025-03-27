import axios, { type AxiosInstance } from "axios";
import { ref } from "vue";

import { useCryptoService } from "@/services/crypto";
import { tryCatch } from "@/utils/try-catch";
import { generateRandomString } from "@/utils/utils";

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
  httpClient?: AxiosInstance;
  sessionInfo?: SessionInfo;
  keepAliveInterval?: number;
}

/**
 * Session information for restoring a previous Interactsh session
 */
interface SessionInfo {
  serverURL: string;
  token: string;
  privateKey: string;
  correlationID: string;
  secretKey: string;
  publicKey?: string;
}

/**
 * Creates and returns an Interactsh client service
 */
export const useClientService = () => {
  const state = ref<State>(State.Idle);
  const correlationID = ref<string>();
  const secretKey = ref<string>();
  const serverURL = ref<URL>();
  const token = ref<string>();
  const quitPollingFlag = ref(false);
  const pollingInterval = ref(5000);
  const cryptoService = useCryptoService();

  let httpClient = axios.create({ timeout: 10000 });
  let correlationIdNonceLength = 13;
  let interactionCallback:
    | ((interaction: Record<string, unknown>) => void)
    | undefined;

  const defaultInteractionHandler = () => {};

  /**
   * Registers the client with the Interactsh server
   * @param payload Registration payload containing keys and correlation ID
   */
  const performRegistration = async (payload: object) => {
    if (!serverURL.value) {
      throw new Error("Server URL is not defined");
    }

    const url = new URL("/register", serverURL.value.toString()).toString();
    const { data, error } = await tryCatch(
      httpClient.post(url, payload, {
        headers: { "Content-Type": "application/json" },
      }),
    );

    if (error) {
      console.error("Registration error:", error);
      throw new Error(
        "Registration failed, please check your server URL and token",
      );
    }

    if (data?.status === 200) {
      state.value = State.Idle;
    } else {
      throw new Error("Registration failed");
    }
  };

  /**
   * Fetches interactions from the Interactsh server
   * @param callback Function to call for each interaction received
   */
  const getInteractions = async (
    callback: (interaction: Record<string, unknown>) => void,
  ) => {
    if (!correlationID.value || !secretKey.value || !serverURL.value) {
      throw new Error("Missing required client configuration");
    }

    const url = new URL(
      `/poll?id=${correlationID.value}&secret=${secretKey.value}`,
      serverURL.value.toString(),
    ).toString();

    const { data, error } = await tryCatch(httpClient.get(url));

    if (error) {
      console.error("Error polling interactions:", error);
      throw new Error("Error polling interactions");
    }

    if (data?.status !== 200) {
      if (data?.status === 401) {
        throw new Error("Couldn't authenticate to the server");
      }
      throw new Error(`Could not poll interactions: ${data?.data}`);
    }

    if (data?.data?.data && Array.isArray(data.data.data)) {
      for (const item of data.data.data) {
        const { data: decryptedData, error: decryptError } = await tryCatch(
          cryptoService.decryptMessage(data.data.aes_key, item),
        );

        if (decryptError) {
          console.error("Failed to decrypt interaction:", decryptError);
          continue;
        }

        try {
          const interaction = JSON.parse(decryptedData.toString());
          callback(interaction);
        } catch (err) {
          console.error("Failed to parse interaction:", err);
        }
      }
    }
  };

  /**
   * Initializes the Interactsh client with the provided options
   * @param options Configuration options
   * @param interactionCallbackParam Callback for handling interactions
   */
  const initialize = async (
    options: Options,
    interactionCallbackParam?: (interaction: Record<string, unknown>) => void,
  ) => {
    httpClient =
      options.httpClient ||
      axios.create({
        timeout: 10000,
        headers: options.token ? { Authorization: options.token } : {},
      });
    token.value = options.token;

    correlationID.value =
      options.sessionInfo?.correlationID ||
      generateRandomString(options.correlationIdLength || 20);
    secretKey.value =
      options.sessionInfo?.secretKey ||
      generateRandomString(options.correlationIdNonceLength || 13);
    serverURL.value = new URL(options.serverURL);
    correlationIdNonceLength = options.correlationIdNonceLength || 13;

    if (interactionCallbackParam) {
      interactionCallback = interactionCallbackParam;
    }

    if (options.sessionInfo) {
      const { token: sessionToken, serverURL: sessionServerURL } =
        options.sessionInfo;
      token.value = sessionToken;
      serverURL.value = new URL(sessionServerURL);
    }

    const publicKey = await cryptoService.encodePublicKey();
    await performRegistration({
      "public-key": publicKey,
      "secret-key": secretKey.value,
      "correlation-id": correlationID.value,
    });

    if (options.keepAliveInterval) {
      pollingInterval.value = options.keepAliveInterval;
      startPolling(interactionCallback || defaultInteractionHandler);
    }
  };

  /**
   * Starts polling the server for interactions
   * @param callback Function to call for each interaction received
   */
  const startPolling = (
    callback: (interaction: Record<string, unknown>) => void,
  ) => {
    if (state.value === State.Polling) {
      throw new Error("Client is already polling");
    }

    quitPollingFlag.value = false;
    state.value = State.Polling;

    const pollingLoop = async () => {
      while (!quitPollingFlag.value) {
        try {
          await getInteractions(callback);
        } catch (err) {
          console.error("Polling error:", err);
          throw new Error("Polling error");
        }
        await new Promise((resolve) =>
          setTimeout(resolve, pollingInterval.value),
        );
      }
    };

    pollingLoop();
  };

  /**
   * Manually polls the server once for interactions
   */
  const poll = async () => {
    if (state.value !== State.Polling) {
      throw new Error("Client is not polling");
    }

    try {
      await getInteractions(interactionCallback || defaultInteractionHandler);
    } catch (err) {
      console.error("Polling error:", err);
      throw new Error("Polling error");
    }
  };

  /**
   * Stops the polling process
   */
  const stopPolling = () => {
    if (state.value !== State.Polling) {
      throw new Error("Client is not polling");
    }

    quitPollingFlag.value = true;
    state.value = State.Idle;
  };

  /**
   * Sets the polling interval in seconds
   * @param seconds Number of seconds between polls
   */
  const setRefreshTimeSecond = (seconds: number) => {
    if (seconds < 5 || seconds > 3600) {
      throw new Error(
        "The polling interval must be between 5 and 3600 seconds",
      );
    }
    pollingInterval.value = seconds * 1000;

    // Restart polling with new interval if currently polling
    if (state.value === State.Polling) {
      stopPolling();
      startPolling(interactionCallback || defaultInteractionHandler);
    }
  };

  /**
   * Updates the polling interval in milliseconds
   * @param ms New polling interval in milliseconds
   */
  const updatePollingInterval = (ms: number) => {
    // Convert to seconds for validation
    const seconds = Math.floor(ms / 1000);
    setRefreshTimeSecond(seconds);
  };

  /**
   * Deregisters the client from the Interactsh server
   */
  const close = async () => {
    if (state.value === State.Polling) {
      throw new Error("Client should stop polling before closing");
    }
    if (state.value === State.Closed) {
      throw new Error("Client is already closed");
    }

    const url = new URL("/deregister", serverURL.value?.toString()).toString();

    const { data, error } = await tryCatch(
      httpClient.post(
        url,
        {
          correlationID: correlationID.value,
          secretKey: secretKey.value,
        },
        { headers: { "Content-Type": "application/json" } },
      ),
    );

    if (error) {
      console.error("Failed to deregister:", error);
      throw new Error("Could not deregister from server");
    }

    if (data?.status !== 200) {
      throw new Error(`Could not deregister from server: ${data?.data}`);
    }

    state.value = State.Closed;
  };

  /**
   * Starts the Interactsh client with the provided options
   * @param options Configuration options
   * @param interactionCallbackParam Callback for handling interactions
   */
  const start = async (
    options: Options,
    interactionCallbackParam?: (interaction: Record<string, unknown>) => void,
  ) => {
    await initialize(options, interactionCallbackParam);
  };

  /**
   * Stops polling and closes the client
   */
  const stop = async () => {
    if (state.value === State.Polling) {
      stopPolling();
    }
    await close();
  };

  /**
   * Generates a unique URL for the current session
   * @param incrementNumber Optional increment number for uniqueness
   * @returns A unique Interactsh URL and its unique ID
   */
  const generateUrl = (
    incrementNumber = 0,
  ): { url: string; uniqueId: string } => {
    if (
      state.value === State.Closed ||
      !correlationID.value ||
      !serverURL.value
    ) {
      return { url: "", uniqueId: "" };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const increment = incrementNumber;
    const arr = new ArrayBuffer(8);
    const view = new DataView(arr);
    view.setUint32(0, timestamp, false);
    view.setUint32(4, increment, false);
    const randomId = generateRandomString(correlationIdNonceLength);
    const url = `https://${correlationID.value}${randomId}.${serverURL.value.host}`;
    const uniqueId = `${correlationID.value}${randomId}`;
    return { url, uniqueId };
  };

  return {
    state,
    start,
    generateUrl,
    poll,
    setRefreshTimeSecond,
    updatePollingInterval,
    stop,
    close,
  };
};
