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

// --------------- Platform Bot ---------------

export interface PlatformBot {
  readonly applicationId: string;
  readonly platform: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

// --------------- Platform Descriptor / Glue Layer ---------------

/**
 * Encapsulates all platform-specific behavior.
 *
 * Adding a new bot platform only requires:
 * 1. Create a platform package implementing a descriptor + entries.
 * 2. Register entries in the server-side entry registry.
 *
 * No switch statements or conditionals needed in BotMessageRouter, BotCallbackService,
 * or AgentBridgeService.
 */
export interface PlatformDescriptor {
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

  /** Extract the chat/channel ID from a composite platformThreadId. */
  extractChatId: (platformThreadId: string) => string;

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

  /** Parse a composite message ID into the platform-native format. */
  parseMessageId: (compositeId: string) => string | number;
}
