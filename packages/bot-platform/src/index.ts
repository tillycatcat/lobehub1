// --------------- Core types ---------------
export { buildRuntimeKey, entryKey, parseRuntimeKey } from './registry';
export type {
  BotPlatformEntry,
  BotPlatformRedisClient,
  BotPlatformRuntimeContext,
  BotProviderConfig,
  CredentialField,
  PlatformBot,
  PlatformBotFactory,
  PlatformMessenger,
  PlatformSettingsSchema,
  PlatformSettingsSchemaProperty,
  PlatformWebhookResolver,
  PlatformWebhookResolverContext,
  RegisteredBotProviderConfig,
} from './types';

// --------------- Platform entries ---------------
export { discordWebsocketEntry } from './platforms/discord/entries';
export { feishuWebhookEntry, larkWebhookEntry } from './platforms/lark/entries';
export { qqWebhookEntry } from './platforms/qq/entries';
export { telegramWebhookEntry } from './platforms/telegram/entries';
