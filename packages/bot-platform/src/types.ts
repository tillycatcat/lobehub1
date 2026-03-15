// ============================================================================
// Bot Platform Core Types
// ============================================================================

// --------------- Credential Schema ---------------

export interface CredentialField {
  description?: string;
  key: string;
  label: string;
  placeholder?: string;
  required: boolean;
  type: 'secret' | 'string';
}

// --------------- Settings Schema ---------------

/**
 * Lightweight JSON Schema subset for describing platform settings.
 *
 * Each platform entry declares a `settingsSchema`.
 * The schema drives:
 * - Frontend: auto-generated settings form
 * - Runtime: default value resolution (user overrides ← schema defaults)
 * - Validation: ajv or similar can validate user input against the schema
 */
export interface PlatformSettingsSchemaProperty {
  default?: unknown;
  description?: string;
  enum?: string[];
  enumLabels?: string[];
  items?: PlatformSettingsSchemaProperty;
  maximum?: number;
  minimum?: number;
  properties?: Record<string, PlatformSettingsSchemaProperty>;
  title?: string;
  type: 'array' | 'boolean' | 'integer' | 'number' | 'object' | 'string';
}

export interface PlatformSettingsSchema {
  properties: Record<string, PlatformSettingsSchemaProperty>;
  type: 'object';
}

// --------------- Platform Messenger ---------------

/**
 * LobeHub-specific outbound capabilities used by callback and bridge services.
 */
export interface PlatformMessenger {
  createMessage: (content: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  triggerTyping: () => Promise<void>;
  updateThreadName?: (name: string) => Promise<void>;
}

// --------------- Platform Bot ---------------

/**
 * A stateful bot instance holding credentials and runtime context.
 *
 * Server services interact with the bot through this interface only.
 * All platform-specific operations are encapsulated here.
 */
export interface PlatformBot {
  readonly applicationId: string;
  /** Create a Chat SDK adapter config for inbound message handling. */
  createAdapter: () => Record<string, any>;

  /** Extract the chat/channel ID from a composite platformThreadId. */
  extractChatId: (platformThreadId: string) => string;
  /** Get a messenger for a specific thread (outbound messaging). */
  getMessenger: (platformThreadId: string) => PlatformMessenger;

  // --- Runtime Operations ---

  /**
   * Called after the bot is registered in BotMessageRouter.
   * Discord: indexes bot by token for gateway forwarding.
   */
  onRegistered?: (context: { registerByToken?: (token: string) => void }) => Promise<void>;

  /** Parse a composite message ID into the platform-native format. */
  parseMessageId: (compositeId: string) => string | number;

  readonly platform: string;

  // --- Lifecycle ---
  start: () => Promise<void>;

  stop: () => Promise<void>;
}

// --------------- Provider Config ---------------

/**
 * Represents a concrete bot provider configuration.
 * Corresponds to a row in the `agentBotProviders` table.
 */
export interface BotProviderConfig {
  applicationId: string;
  connectionMode: string;
  credentials: Record<string, string>;
  platform: string;
  settings: Record<string, unknown>;
}

// --------------- Runtime Context ---------------

export interface BotPlatformRedisClient {
  del: (key: string) => Promise<number>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { ex?: number }) => Promise<string | null>;
  subscribe?: (channel: string, callback: (message: string) => void) => Promise<void>;
}

export interface BotPlatformRuntimeContext {
  appUrl?: string;
  redisClient?: BotPlatformRedisClient;
  registerByToken?: (token: string) => void;
}

// --------------- Bot Factory ---------------

export type PlatformBotFactory = (
  account: BotProviderConfig,
  context: BotPlatformRuntimeContext,
) => PlatformBot;

// --------------- Platform Entry ---------------

/**
 * A platform registration entry, uniquely identified by `platform + connectionMode`.
 *
 * Entry is metadata + factory. All runtime operations go through PlatformBot.
 */
export interface BotPlatformEntry {
  // --- Identity ---
  connectionMode: 'webhook' | 'websocket';
  // --- Factory ---
  createBot: PlatformBotFactory;
  // --- Schemas (for frontend UI) ---
  credentials: CredentialField[];

  description?: string;
  displayName: string;
  platform: string;
  /** URL to the platform's developer portal / open platform console */
  portalUrl?: string;

  // --- Webhook routing (optional) ---
  resolveWebhook?: PlatformWebhookResolver;

  settings?: PlatformSettingsSchema;
}

// --------------- Webhook Resolver ---------------

export interface RegisteredBotProviderConfig {
  config: BotProviderConfig;
  entry: BotPlatformEntry;
  runtimeKey: string;
}

export interface PlatformWebhookResolverContext {
  params?: Record<string, string | undefined>;
  registeredBots: RegisteredBotProviderConfig[];
  request: Request;
}

export type PlatformWebhookResolver = (
  context: PlatformWebhookResolverContext,
) => Promise<RegisteredBotProviderConfig | undefined> | RegisteredBotProviderConfig | undefined;
