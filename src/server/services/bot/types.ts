/**
 * Re-export core platform types from @lobechat/bot-platform-core.
 *
 * The canonical definitions now live in the core package. This file preserves
 * backward compatibility so existing server-side imports continue to work.
 */
// PlatformBotClass is server-specific (used by the legacy platformBotRegistry)
// and stays here until Phase 3+4 replaces it with entry-based lifecycle.
import type { PlatformBot } from '@lobechat/bot-platform-core';

export type {
  PlatformBot,
  PlatformDescriptor,
  PlatformMessenger,
} from '@lobechat/bot-platform-core';

export type PlatformBotClass = (new (config: any) => PlatformBot) & {
  /** Whether instances require a persistent connection (e.g. WebSocket). */
  persistent?: boolean;
};
