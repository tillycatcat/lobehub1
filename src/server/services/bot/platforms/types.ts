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
 * Each platform definition declares a `settingsSchema`.
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

// --------------- Usage Stats ---------------

/**
 * Raw usage statistics for a bot response.
 * Passed to `PlatformClient.formatReply` so each platform can decide
 * whether and how to render usage information.
 */
export interface UsageStats {
  elapsedMs?: number;
  llmCalls?: number;
  toolCalls?: number;
  totalCost: number;
  totalTokens: number;
}

// --------------- Platform Client ---------------

/**
 * A client to a specific platform instance, holding credentials and runtime context.
 *
 * Server services interact with the platform through this interface only.
 * All platform-specific operations are encapsulated here.
 */
export interface PlatformClient {
  readonly applicationId: string;
  /** Create a Chat SDK adapter config for inbound message handling. */
  createAdapter: () => Record<string, any>;

  /** Extract the chat/channel ID from a composite platformThreadId. */
  extractChatId: (platformThreadId: string) => string;

  /**
   * Format the final outbound reply from body content and optional usage stats.
   * Each platform decides whether to render the stats and how to format them
   * (e.g. Discord uses `-# stats` when the user enables usage display).
   * When not implemented, the caller returns body as-is (no stats).
   */
  formatReply?: (body: string, stats?: UsageStats) => string;

  /** Get a messenger for a specific thread (outbound messaging). */
  getMessenger: (platformThreadId: string) => PlatformMessenger;

  // --- Runtime Operations ---

  readonly id: string;

  /** Parse a composite message ID into the platform-native format. */
  parseMessageId: (compositeId: string) => string | number;

  /** Strip platform-specific bot mention artifacts from user input. */
  sanitizeUserInput?: (text: string) => string;

  /**
   * Whether the bot should subscribe to a thread. Default: true.
   * Discord: returns false for top-level channels (not threads).
   */
  shouldSubscribe?: (threadId: string) => boolean;

  // --- Lifecycle ---
  start: (options?: any) => Promise<void>;

  stop: () => Promise<void>;
}

// --------------- Provider Config ---------------

/**
 * Represents a concrete bot provider configuration.
 * Corresponds to a row in the `agentBotProviders` table.
 */
export interface BotProviderConfig {
  applicationId: string;
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

// --------------- Validation ---------------

export interface ValidationResult {
  errors?: Array<{ field: string; message: string }>;
  valid: boolean;
}

// --------------- Platform Documentation ---------------

export interface PlatformDocumentation {
  /** URL to the platform's developer portal / open platform console */
  portalUrl?: string;
  /** URL to the usage documentation (e.g. LobeHub docs for this platform) */
  setupGuideUrl?: string;
}

// --------------- Client Factory ---------------

/**
 * Abstract base class for creating PlatformClient instances.
 *
 * - `createClient` (abstract): instantiate a PlatformClient (e.g. based on connectionMode)
 * - `validateCredentials`: verify credentials against the platform API — called from UI flow only
 * - `validateSettings`: validate platform-specific settings — called from UI flow only
 */
export abstract class ClientFactory {
  /** Create a PlatformClient instance. Fast and sync — no network calls. */
  abstract createClient(
    config: BotProviderConfig,
    context: BotPlatformRuntimeContext,
  ): PlatformClient;

  /**
   * Verify credentials against the platform API.
   * Called explicitly from the UI/API layer when the user saves credentials.
   */
  async validateCredentials(
    _credentials: Record<string, string>,
    _settings?: Record<string, unknown>,
  ): Promise<ValidationResult> {
    return { valid: true };
  }

  /**
   * Validate platform-specific settings.
   * Called explicitly from the UI/API layer when the user saves settings.
   */
  async validateSettings(_settings: Record<string, unknown>): Promise<ValidationResult> {
    return { valid: true };
  }
}

// --------------- Platform Definition ---------------

/**
 * A platform definition, uniquely identified by `id`.
 *
 * Contains metadata, factory, and validation. All runtime operations go through PlatformClient.
 */
export interface PlatformDefinition {
  /** Factory for creating PlatformClient instances and validating credentials/settings. */
  clientFactory: ClientFactory;

  /** The credentials required for the platform. */
  credentials: CredentialField[];

  /** The description of the platform. */
  description?: string;

  /** Documentation links for the platform */
  documentation?: PlatformDocumentation;

  /** The unique identifier of the platform. */
  id: string;

  /** The name of the platform. */
  name: string;

  /** Strip platform-specific bot mention artifacts from user input text. */
  sanitizeUserInput?: (text: string, applicationId: string) => string;

  /** The settings schema required for the platform. */
  settings?: PlatformSettingsSchema;
}
