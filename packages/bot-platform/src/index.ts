// --------------- Core types ---------------
export { buildRuntimeKey, parseRuntimeKey, PlatformRegistry } from './registry';
export type {
  AdapterFactory,
  BotPlatformRedisClient,
  BotPlatformRuntimeContext,
  BotProviderConfig,
  CredentialField,
  PlatformClient,
  PlatformDefinition,
  PlatformDocumentation,
  PlatformMessenger,
  PlatformSettingsSchema,
  PlatformSettingsSchemaProperty,
  UsageStats,
  ValidationResult,
} from './types';

// --------------- Utils ---------------
export { formatDuration, formatTokens, formatUsageStats } from './utils';

// --------------- Platform definitions ---------------
export { discord } from './platforms/discord/definition';
export { feishu } from './platforms/feishu/definition';
export { qq } from './platforms/qq/definition';
export { telegram } from './platforms/telegram/definition';
