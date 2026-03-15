/**
 * Re-export core platform types from @lobechat/bot-platform.
 *
 * The canonical definitions now live in the core package. This file preserves
 * backward compatibility so existing server-side imports continue to work.
 */
// PlatformBotClass is server-specific (used by the legacy platformBotRegistry)
// and stays here until Phase 3+4 replaces it with entry-based lifecycle.
import type { PlatformBot, PlatformMessenger } from '@lobechat/bot-platform';

export type { PlatformBot, PlatformMessenger } from '@lobechat/bot-platform';

export type PlatformBotClass = (new (config: any) => PlatformBot) & {
  /** Whether instances require a persistent connection (e.g. WebSocket). */
  persistent?: boolean;
};

/**
 * Legacy server-side descriptor interface.
 * TODO(Phase 3+4): Remove when server migrates to entry-based registry.
 */
export interface PlatformDescriptor {
  createAdapter: (
    credentials: Record<string, string>,
    applicationId: string,
  ) => Record<string, any>;
  createMessenger: (
    credentials: Record<string, string>,
    platformThreadId: string,
  ) => PlatformMessenger;
  extractChatId: (platformThreadId: string) => string;
  onBotRegistered?: (context: {
    applicationId: string;
    credentials: Record<string, string>;
    registerByToken?: (token: string) => void;
  }) => Promise<void>;
  parseMessageId: (compositeId: string) => string | number;
}
