import type { BotProviderConfig } from './bot';
import type { BotPlatformEntry } from './entry';

// --------------- Registered Provider ---------------

/**
 * A fully-resolved runtime record: a provider config bound to its entry and runtime key.
 * Used by the webhook resolver and the server-side bot instance registry.
 */
export interface RegisteredBotProviderConfig {
  account: BotProviderConfig;
  entry: BotPlatformEntry;
  runtimeKey: string;
}

// --------------- Webhook Resolver ---------------

/**
 * Context provided to a platform's webhook resolver when an inbound
 * webhook request needs to be routed to the correct bot instance.
 */
export interface PlatformWebhookResolverContext {
  /** URL path parameters from the webhook endpoint */
  params?: Record<string, string | undefined>;
  /** All registered bots for this platform */
  registeredBots: RegisteredBotProviderConfig[];
  /** The inbound HTTP request */
  request: Request;
}

/**
 * Platform-specific webhook routing strategy.
 *
 * Each platform can define its own resolution logic:
 * - Discord: header token lookup or interaction payload `application_id`
 * - Telegram: `applicationId` from the URL path
 * - Third-party platforms: custom routing rules
 *
 * This removes platform-specific conditionals from the server-side BotMessageRouter.
 */
export type PlatformWebhookResolver = (
  context: PlatformWebhookResolverContext,
) => Promise<RegisteredBotProviderConfig | undefined> | RegisteredBotProviderConfig | undefined;
