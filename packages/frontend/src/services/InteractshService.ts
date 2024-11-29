import axios, { AxiosInstance } from 'axios';
import { ref, Ref } from 'vue';
import { cryptoService } from '@/services/CryptoService';
import { v4 as uuidv4 } from 'uuid';

enum State {
    Idle,
    Polling,
    Closed,
}

interface Options {
    serverURL?: string;
    token?: string;
    disableHTTPFallback?: boolean;
    correlationIdLength?: number;
    correlationIdNonceLength?: number;
    httpClient?: AxiosInstance;
    sessionInfo?: SessionInfo;
    keepAliveInterval?: number;
}

interface SessionInfo {
    serverURL: string;
    token: string;
    privateKey: string;
    correlationID: string;
    secretKey: string;
    publicKey?: string;
}

export const useClientService = () => {
    const state: Ref<State> = ref(State.Idle);
    const correlationID: Ref<string | null> = ref(null);
    const secretKey: Ref<string | null> = ref(null);
    const serverURL: Ref<URL | null> = ref(null);
    const token: Ref<string | null> = ref(null);
    let httpClient: AxiosInstance = axios.create({ timeout: 10000 });
    const quitPollingFlag: Ref<boolean> = ref(false);
    let correlationIdNonceLength = 13; // default value
    let interactionCallback: ((interaction: any) => void) | null = null;
    let dataHandler: ((interaction: any) => any) | null = null;

    // Polling interval in milliseconds (default 5000ms)
    const pollingInterval: Ref<number> = ref(5000);

    // Initialize client with options
    const initialize = async (
        options: Options,
        interactionCallbackParam?: (interaction: any) => void,
        dataHandlerParam?: (interaction: any) => any
    ) => {
        httpClient = options.httpClient || axios.create({ timeout: 10000 });
        token.value = options.token || uuidv4();
        correlationID.value =
            options.sessionInfo?.correlationID ||
            generateRandomID(options.correlationIdLength || 20);
        secretKey.value =
            options.sessionInfo?.secretKey ||
            generateRandomID(options.correlationIdNonceLength || 13);
        serverURL.value = new URL(options.serverURL || 'https://oast.site');

        correlationIdNonceLength = options.correlationIdNonceLength || 13;

        if (interactionCallbackParam) {
            interactionCallback = interactionCallbackParam;
        }

        if (dataHandlerParam) {
            dataHandler = dataHandlerParam;
        }

        if (options.sessionInfo) {
            // Load session details
            const session = options.sessionInfo;
            token.value = session.token;
            serverURL.value = new URL(session.serverURL);
        }

        // Generate publicKey and perform registration
        const publicKey = await cryptoService.encodePublicKey();
        const payload = {
            'public-key': publicKey,
            'secret-key': secretKey.value,
            'correlation-id': correlationID.value,
        };
        await performRegistration(payload);

        // Optionally start polling
        if (options.keepAliveInterval) {
            pollingInterval.value = options.keepAliveInterval;
            startPolling(interactionCallback || defaultInteractionHandler);
        }
    };

    const defaultInteractionHandler = (interaction: any) => {
        console.log('Received interaction:', interaction);
    };

    // Perform registration
    const performRegistration = async (payload: object) => {
        if (!serverURL.value) throw new Error('Server URL is not defined');
        const url = new URL('/register', serverURL.value.toString()).toString();
        try {
            const response = await httpClient.post(url, payload, {
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.status === 200) {
                state.value = State.Idle;
                console.log(response.data);
            } else {
                throw new Error('Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
        }
    };

    // Update getInteractions to include dataHandler
    const getInteractions = async (
        callback: (interaction: any) => void,
        dataHandler?: (interaction: any) => any
    ) => {
        try {
            const url = new URL(
                `/poll?id=${correlationID.value}&secret=${secretKey.value}`,
                serverURL.value?.toString() || ''
            ).toString();
            const headers: any = {};
            if (token.value) {
                headers['Authorization'] = token.value;
            }

            const response = await httpClient.get(url, { headers });
            if (response.status !== 200) {
                if (response.status === 401) {
                    throw new Error("Couldn't authenticate to the server");
                }
                throw new Error(`Could not poll interactions: ${response.data}`);
            }

            const data = response.data;
            if (data.data && Array.isArray(data.data)) {
                for (const item of data.data) {
                    const plaintext = await cryptoService.decryptMessage(data.aes_key, item);
                    let interaction = JSON.parse(plaintext.toString());
                    if (dataHandler) {
                        interaction = dataHandler(interaction);
                    }
                    callback(interaction);
                }
            }
        } catch (err) {
            console.error(`Error polling interactions: ${err}`);
        }
    };

    // Start polling interactions
    const startPolling = (callback: (interaction: any) => void) => {
        if (state.value === State.Polling) {
            throw new Error('Client is already polling');
        }
        quitPollingFlag.value = false;
        state.value = State.Polling;

        const pollingLoop = async () => {
            while (!quitPollingFlag.value) {
                try {
                    await getInteractions(callback, dataHandler);
                } catch (err) {
                    console.error('Polling error:', err);
                }
                await new Promise((resolve) => setTimeout(resolve, pollingInterval.value));
            }
        };
        pollingLoop();
    };

    // Force immediate polling
    const poll = async () => {
        if (state.value !== State.Polling) {
            throw new Error('Client is not polling');
        }
        try {
            await getInteractions(interactionCallback || defaultInteractionHandler, dataHandler);
        } catch (err) {
            console.error('Polling error:', err);
        }
    };

    // Stop polling interactions
    const stopPolling = () => {
        if (state.value !== State.Polling) {
            throw new Error('Client is not polling');
        }
        quitPollingFlag.value = true;
        state.value = State.Idle;
    };

    // Set polling interval in seconds
    const setRefreshTimeSecond = (seconds: number) => {
        if (seconds < 5 || seconds > 3600) {
            throw new Error('The polling interval must be between 5 and 3600 seconds');
        }
        pollingInterval.value = seconds * 1000; // Convert seconds to milliseconds
    };

    // Close the client
    const close = async () => {
        if (state.value === State.Polling) {
            throw new Error('Client should stop polling before closing');
        }
        if (state.value === State.Closed) {
            throw new Error('Client is already closed');
        }

        const deregisterRequest = {
            correlationID: correlationID.value,
            secretKey: secretKey.value,
        };
        const url = new URL('/deregister', serverURL.value?.toString() || '').toString();
        const headers: any = { 'Content-Type': 'application/json' };
        if (token.value) {
            headers['Authorization'] = token.value;
        }
        try {
            const response = await httpClient.post(url, deregisterRequest, { headers });
            if (response.status !== 200) {
                throw new Error(`Could not deregister from server: ${response.data}`);
            }
            state.value = State.Closed;
        } catch (err) {
            throw err;
        }
    };

    // Start the client (initialize and start polling)
    const start = async (
        options: Options,
        interactionCallbackParam?: (interaction: any) => void,
        dataHandlerParam?: (interaction: any) => any
    ) => {
        await initialize(options, interactionCallbackParam, dataHandlerParam);
    };

    // Stop the client (stop polling and close)
    const stop = async () => {
        if (state.value === State.Polling) {
            stopPolling();
        }
        await close();
    };

    // Save session data (front-end friendly, JSON export)
    const saveSession = () => {
        if (!serverURL.value || !correlationID.value || !secretKey.value) {
            throw new Error('Session data is incomplete');
        }
        const session: SessionInfo = {
            serverURL: serverURL.value.toString(),
            token: token.value || '',
            privateKey: cryptoService.getPrivateKey(),
            correlationID: correlationID.value,
            secretKey: secretKey.value,
        };
        return JSON.stringify(session, null, 2); // Return JSON string for download or storage
    };

    // Generate a random ID
    const generateRandomID = (length: number): string => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < length; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    };

    // Generate a new interaction URL
    const generateUrl = (): string => {
        if (state.value === State.Closed || !correlationID.value || !serverURL.value) {
            return '';
        }

        const randomData = generateRandomID(correlationIdNonceLength);
        return `https://${correlationID.value}${randomData}.${serverURL.value.host}`;
    };

    return {
        state,
        correlationID,
        secretKey,
        serverURL,
        token,
        initialize,
        performRegistration,
        startPolling,
        stopPolling,
        setRefreshTimeSecond,
        start,
        stop,
        close,
        saveSession,
        generateUrl,
        poll, // Expose the poll method
    };
};
