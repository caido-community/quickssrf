# QuickSSRF Backend API

> 22 RPC endpoints for Out-of-Band (OOB) interaction monitoring. Usable from the frontend plugin or programmatically via the Caido SDK client in CI/CD pipelines.

## Quick Start

```typescript
const session = await sdk.backend.createSession();
const interactions = await sdk.backend.pollSession(session.value.id);

for (const interaction of interactions.value) {
  console.log(interaction.protocol, interaction.remoteAddress);
}
```

Every API method returns `Result<T>`:

```typescript
type Result<T> =
  | { kind: "Ok"; value: T }
  | { kind: "Error"; error: string };

const result = await sdk.backend.createSession();
if (result.kind === "Error") {
  sdk.window.showToast(result.error, { variant: "error" });
  return;
}
const session = result.value;
```

---

## API Reference

### Sessions

```typescript
createSession(providerId?: string): Promise<Result<Session>>
getSessions(): Promise<Result<Session[]>>
getSession(sessionId: string): Promise<Result<Session>>
stopSession(sessionId: string): Promise<Result<void>>
deleteSession(sessionId: string): Promise<Result<void>>
pollSession(sessionId: string): Promise<Result<Interaction[]>>
updateSessionTitle(sessionId: string, title: string): Promise<Result<Session>>
getActiveSessionIds(): Result<string[]>
resumeSession(sessionId: string): Result<void>  // not supported, always returns error
```

### Providers

```typescript
getProviders(): Result<Provider[]>
getProvider(providerId: string): Result<Provider>
addProvider(input: CreateProvider): Promise<Result<Provider>>
updateProvider(providerId: string, updates: UpdateProvider): Promise<Result<Provider>>
deleteProvider(providerId: string): Promise<Result<void>>
```

### Interactions

```typescript
getInteractions(sessionId: string): Promise<Result<Interaction[]>>
deleteInteraction(sessionId: string, interactionId: string): Promise<Result<void>>
clearInteractions(sessionId: string): Promise<Result<void>>
```

### Config

```typescript
getConfig(): Result<QuickSSRFConfig>
updateConfig(updates: UpdateConfig): Promise<Result<QuickSSRFConfig>>
```

### Polling

```typescript
startPolling(): Result<void>
stopPolling(): Result<void>
getPollingStatus(): Result<boolean>
```

---

## Sessions

Sessions represent active OAST monitoring endpoints. Each session generates a unique URL that captures DNS, HTTP, SMTP, and other protocol interactions.

### Create a session

```typescript
// Use default provider (oast.site)
const session = await sdk.backend.createSession();
console.log(session.value.url); // "https://abc123xyz.oast.site"

// Use a specific provider
const providers = await sdk.backend.getProviders();
const oastFun = providers.value.find((p) => p.name === "oast.fun");
const session2 = await sdk.backend.createSession(oastFun.id);
```

### Poll for interactions

```typescript
const result = await sdk.backend.pollSession(sessionId);
if (result.kind === "Ok" && result.value.length > 0) {
  for (const interaction of result.value) {
    console.log(
      `[${interaction.protocol.toUpperCase()}] ${interaction.remoteAddress} → ${interaction.fullId}`,
    );
    if (interaction.rawRequest) {
      console.log("Request:", interaction.rawRequest.slice(0, 200));
    }
  }
}
```

### Session lifecycle

```typescript
// Create
const session = await sdk.backend.createSession();

// Rename
await sdk.backend.updateSessionTitle(session.value.id, "SSRF Test #1");

// Get interactions
const interactions = await sdk.backend.getInteractions(session.value.id);

// Stop polling (keeps data)
await sdk.backend.stopSession(session.value.id);

// Delete everything
await sdk.backend.deleteSession(session.value.id);
```

### CI/CD SSRF detection

```typescript
// 1. Create session
const { value: session } = await sdk.backend.createSession();

// 2. Inject URL into your scanner
await runYourScanner(`http://target.com/ssrf?url=${session.url}`);

// 3. Wait and poll
await new Promise((r) => setTimeout(r, 10000));
const { value: interactions } = await sdk.backend.pollSession(session.id);

// 4. Assert
if (interactions.length > 0) {
  console.log("SSRF confirmed!");
  console.log(`Protocol: ${interactions[0].protocol}`);
  console.log(`Source IP: ${interactions[0].remoteAddress}`);
  console.log(`Timestamp: ${interactions[0].timestamp}`);
}

// 5. Cleanup
await sdk.backend.deleteSession(session.id);
```

### Monitor multiple targets in parallel

```typescript
const targets = [
  "http://target1.com/redirect?url=",
  "http://target2.com/proxy?dest=",
  "http://target3.com/fetch?src=",
];

const sessions = await Promise.all(
  targets.map(() => sdk.backend.createSession()),
);

for (let i = 0; i < targets.length; i++) {
  await runYourScanner(`${targets[i]}${sessions[i].value.url}`);
}

await new Promise((r) => setTimeout(r, 15000));

for (let i = 0; i < sessions.length; i++) {
  const result = await sdk.backend.pollSession(sessions[i].value.id);
  if (result.kind === "Ok" && result.value.length > 0) {
    console.log(`Target ${i + 1} is vulnerable! (${result.value.length} interactions)`);
  }
}

await Promise.all(
  sessions.map((s) => sdk.backend.deleteSession(s.value.id)),
);
```

---

## Providers

Providers are OAST backends that generate payload URLs and capture interactions. Ships with `oast.site` as the default. More can be added via Quick Add or Custom.

### Provider types

```
interactsh  - DNS, HTTP, SMTP, FTP, LDAP, SMB, responder (e.g. oast.site)
webhooksite - HTTP only, no auth (webhook.site)
postbin     - HTTP only, no auth (toptal.com/developers/postbin)
custom      - Any HTTP endpoint, optional bearer auth, flexible response format
```

### Default provider (seeded on first launch)

```
oast.site   https://oast.site
```

### Quick Add presets (available in Settings > Providers)

```
oast.fun, oast.me, oast.pro, oast.live, Webhook.site, PostBin
```

PostBin sessions auto-expire after 30 minutes (matching PostBin's server-side bin expiry).

### Add a self-hosted Interactsh server

```typescript
await sdk.backend.addProvider({
  name: "My Interactsh",
  kind: "interactsh",
  url: "https://interactsh.mycompany.com",
  token: "my-auth-token",
  enabled: true,
});
```

### Add a custom HTTP callback endpoint

```typescript
await sdk.backend.addProvider({
  name: "My Webhook",
  kind: "custom",
  url: "https://my-callback-server.com/api/events",
  token: "Bearer my-api-key",
  enabled: true,
});
```

### Manage providers

```typescript
// Disable without deleting
await sdk.backend.updateProvider(providerId, { enabled: false });

// Change the default provider
const providers = await sdk.backend.getProviders();
const oastFun = providers.value.find((p) => p.name === "oast.fun");
await sdk.backend.updateConfig({ defaultProviderId: oastFun.id });

// Delete
await sdk.backend.deleteProvider(providerId);
```

---

## Interactions

Captured events (DNS lookups, HTTP requests, SMTP connections, etc.) from a session's OAST URL.

### Supported protocols

```
dns  http  https  smtp  smtps  ftp  ftps  smb  ldap  responder  unknown
```

### Filter by protocol

```typescript
const result = await sdk.backend.getInteractions(sessionId);
const dnsOnly = result.value.filter((i) => i.protocol === "dns");
const httpOnly = result.value.filter(
  (i) => i.protocol === "http" || i.protocol === "https",
);
```

### View raw request/response

```typescript
const result = await sdk.backend.getInteractions(sessionId);
for (const interaction of result.value) {
  console.log(`--- ${interaction.protocol.toUpperCase()} #${interaction.index} ---`);
  console.log(`From: ${interaction.remoteAddress}`);
  console.log(`Time: ${interaction.timestamp}`);
  if (interaction.rawRequest) {
    console.log(`Request:\n${interaction.rawRequest}`);
  }
  if (interaction.rawResponse) {
    console.log(`Response:\n${interaction.rawResponse}`);
  }
}
```

### Export as JSON

```typescript
const result = await sdk.backend.getInteractions(sessionId);
const exported = JSON.stringify(result.value, undefined, 2);
```

### Clear all interactions (keep session)

```typescript
await sdk.backend.clearInteractions(sessionId);
```

---

## Config

### Config fields

```typescript
type QuickSSRFConfig = {
  defaultProviderId?: string;   // Provider for new sessions (falls back to first enabled)
  pollingInterval: number;      // Background poll interval in ms, 1000–60000 (default: 5000)
  autoPolling: boolean;         // Auto-poll all active sessions (default: true)
  notificationsEnabled: boolean;// Notify on new interactions (default: false)
  correlationIdLength: number;  // Correlation ID length, 1–63 (default: 20)
  correlationIdNonceLength: number; // Nonce length, 1–63 (default: 13)
};
```

### Configure for fast polling

```typescript
await sdk.backend.updateConfig({
  pollingInterval: 2000,
  autoPolling: true,
});
```

### Manual polling only

```typescript
await sdk.backend.updateConfig({ autoPolling: false });
sdk.backend.stopPolling();
```

### Read current config

```typescript
const config = sdk.backend.getConfig();
console.log(`Polling every ${config.value.pollingInterval}ms`);
console.log(`Auto-polling: ${config.value.autoPolling}`);
```

---

## Polling Control

```typescript
// Start background polling
sdk.backend.startPolling();

// Stop background polling
sdk.backend.stopPolling();

// Check status
const isActive = sdk.backend.getPollingStatus();
console.log(`Polling: ${isActive.value}`);

// Toggle
const status = sdk.backend.getPollingStatus();
if (status.value) {
  sdk.backend.stopPolling();
} else {
  sdk.backend.startPolling();
}
```

---

## Events

Events emitted from backend to frontend. Subscribe with `sdk.backend.onEvent()`.

```typescript
// New interactions received
sdk.backend.onEvent("interaction:received", (data) => {
  console.log(`Session ${data.sessionId}: ${data.interactions.length} new interactions`);
  for (const interaction of data.interactions) {
    console.log(`  [${interaction.protocol}] from ${interaction.remoteAddress}`);
  }
});

// Session lifecycle
sdk.backend.onEvent("session:created", (session) => {
  console.log(`New session: ${session.url}`);
});

sdk.backend.onEvent("session:updated", (session) => {
  console.log(`${session.id} → ${session.status} (${session.interactionCount} interactions)`);
});

sdk.backend.onEvent("session:deleted", (sessionId) => {
  console.log(`Session ${sessionId} deleted`);
});

// Provider changes
sdk.backend.onEvent("provider:created", (provider) => {
  console.log(`New provider: ${provider.name} (${provider.kind})`);
});

sdk.backend.onEvent("provider:updated", (provider) => {
  console.log(`Updated: ${provider.name}`);
});

sdk.backend.onEvent("provider:deleted", (providerId) => {
  console.log(`Provider ${providerId} removed`);
});

// Config changes
sdk.backend.onEvent("config:updated", (config) => {
  console.log(`Polling interval: ${config.pollingInterval}ms`);
});
```

---

## Session Persistence

Sessions survive plugin restarts. When the plugin initializes:

1. RSA keys are loaded from encrypted storage (or generated on first run)
2. Active sessions are restored from disk with their provider credentials
3. Polling resumes automatically for restored active sessions

Sessions that were created before RSA key persistence was added will be marked as "expired" since their encryption keys are lost.

---

## Types

All types from `"shared"`:

```typescript
import type {
  Session,              // OAST monitoring session
  SessionStatus,        // "active" | "polling" | "stopped" | "expired" | "error"
  Interaction,          // Captured event (DNS/HTTP/etc.)
  InteractionProtocol,  // "dns" | "http" | ... | "unknown"
  Provider,             // OAST backend config
  ProviderKind,         // "interactsh" | "webhooksite" | "postbin" | "custom"
  CreateProvider,       // Input for addProvider
  UpdateProvider,       // Input for updateProvider
  QuickSSRFConfig,      // Plugin config
  UpdateConfig,         // Input for updateConfig
  Result,               // { kind: "Ok", value: T } | { kind: "Error", error: string }
} from "shared";
```

