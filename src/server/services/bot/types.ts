// --------------- Platform Messenger / Extension Layer ---------------

/**
 * LobeHub-specific outbound capabilities used by callback and bridge services.
 *
 * This is intentionally separate from the Chat SDK adapter interface:
 * - Official adapters may not expose every platform feature we need.
 * - Self-owned adapters can share lower-level platform clients with this layer.
 *
 * Think of this as the platform extension layer that sits beside the adapter.
 */
export interface PlatformMessenger {
  createMessage: (content: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  triggerTyping: () => Promise<void>;
  updateThreadName?: (name: string) => Promise<void>;
}

// --------------- Platform Bot (lifecycle) ---------------

export interface PlatformBot {
  readonly applicationId: string;
  readonly platform: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export type PlatformBotClass = (new (config: any) => PlatformBot) & {
  /** Whether instances require a persistent connection (e.g. WebSocket). */
  persistent?: boolean;
};

// --------------- Platform Descriptor / Glue Layer ---------------

/**
 * Encapsulates all platform-specific behavior.
 *
 * Adding a new bot platform only requires:
 * 1. Create a new file in `platforms/` implementing a descriptor + PlatformBot class.
 * 2. Register in `platforms/index.ts`.
 *
 * No switch statements or conditionals needed in BotMessageRouter, BotCallbackService,
 * or AgentBridgeService.
 */
export interface PlatformDescriptor {
  /** Maximum characters per message. Undefined = use default (1800). */
  charLimit?: number;

  /**
   * Create a Chat SDK adapter config object keyed by adapter name.
   *
   * This is the standard adapter layer:
   * - Official platforms usually delegate to a Vercel adapter
   * - Self-owned platforms delegate to @lobechat/adapter-* packages
   */
  createAdapter: (
    credentials: Record<string, string>,
    applicationId: string,
  ) => Record<string, any>;

  /**
   * Create the LobeHub platform extension layer used by callback/bridge flows.
   *
   * For self-owned adapters, prefer reusing the platform API client exported by
   * the adapter package instead of re-implementing it in the server layer.
   */
  createMessenger: (
    credentials: Record<string, string>,
    platformThreadId: string,
  ) => PlatformMessenger;

  /**
   * How long to wait for additional messages before dispatching to the agent (ms).
   * Users often send multiple short messages in quick succession; this debounce
   * window merges them into a single prompt. Undefined = use default (2000ms).
   */
  debounceMs?: number;

  /** Extract the chat/channel ID from a composite platformThreadId. */
  extractChatId: (platformThreadId: string) => string;

  // ---------- Thread/Message ID parsing ----------

  /**
   * Whether to register onNewMessage handler for direct messages.
   * Telegram & Lark need this; Discord does not (would cause unsolicited replies).
   */
  handleDirectMessages: boolean;

  /**
   * Called after a bot is registered in BotMessageRouter.loadAgentBots().
   * Discord: indexes bot by token for gateway forwarding.
   * Telegram: calls setWebhook API.
   */
  onBotRegistered?: (context: {
    applicationId: string;
    credentials: Record<string, string>;
    registerByToken?: (token: string) => void;
  }) => Promise<void>;

  // ---------- Credential validation ----------

  /** Parse a composite message ID into the platform-native format. */
  parseMessageId: (compositeId: string) => string | number;

  // ---------- Factories ----------

  /** Whether the platform uses persistent connections (WebSocket/Gateway). */
  persistent: boolean;

  /** Platform identifier (e.g., 'discord', 'telegram', 'lark'). */
  platform: string;

  // ---------- Lifecycle hooks ----------

  /** Required credential field names for this platform. */
  requiredCredentials: string[];
}
