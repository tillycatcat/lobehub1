// --------------- Core types & utilities ---------------
// --------------- Registry singleton ---------------
import { discord } from './discord/definition';
import { feishu } from './feishu/definition';
import { qq } from './qq/definition';
import { PlatformRegistry } from './registry';
import { telegram } from './telegram/definition';

export { PlatformRegistry } from './registry';
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
export {
  buildRuntimeKey,
  formatDuration,
  formatTokens,
  formatUsageStats,
  parseRuntimeKey,
} from './utils';

// --------------- Platform definitions ---------------
export { discord } from './discord/definition';
export { feishu } from './feishu/definition';
export { qq } from './qq/definition';
export { telegram } from './telegram/definition';

export const platformRegistry = new PlatformRegistry();

platformRegistry.register(discord);
platformRegistry.register(telegram);
platformRegistry.register(feishu);
platformRegistry.register(qq);

// Convenience accessors
export const getDefinition = platformRegistry.getPlatform.bind(platformRegistry);
export const getAllDefinitions = platformRegistry.listPlatforms.bind(platformRegistry);
