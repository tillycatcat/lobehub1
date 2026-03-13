import type { PlatformBotFactory } from './bot';
import type { BotPlatformMetadata } from './metadata';
import type { PlatformDescriptor } from './types';
import type { PlatformWebhookResolver } from './webhook';

// --------------- Platform Entry ---------------

/**
 * A runnable platform entry, uniquely identified by `platform + connectionMode`.
 *
 * Platform packages export one or more entries. For example, `@lobechat/bot-platform-lark`
 * exports entries for both `lark` (webhook) and `feishu` (webhook + websocket).
 *
 * The server-side registry loads all entries and uses them to:
 * - Look up descriptors for webhook handling and message routing
 * - Instantiate bots for persistent connections
 * - Expose metadata to the frontend configuration UI
 */
export interface BotPlatformEntry {
  /** Connection mode: determines runtime behavior and credential requirements */
  connectionMode: 'webhook' | 'websocket';

  /** Optional factory for creating PlatformBot instances (persistent connections, startup hooks) */
  createBot?: PlatformBotFactory;

  /** Standard platform behavior: adapter creation, messenger, ID parsing, etc. */
  descriptor: PlatformDescriptor;

  /** Platform capabilities, display info, and credential schema for the config UI */
  metadata: BotPlatformMetadata;

  /** Platform identifier, directly maps to the `platform` field in DB and URL paths */
  platform: string;

  /** Optional platform-specific webhook routing strategy */
  resolveWebhook?: PlatformWebhookResolver;
}
