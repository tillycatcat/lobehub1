import { discord, feishu, PlatformRegistry, qq, telegram } from '@lobechat/bot-platform';

export const platformRegistry = new PlatformRegistry();

platformRegistry.register(discord);
platformRegistry.register(telegram);
platformRegistry.register(feishu);
platformRegistry.register(qq);

// Re-export convenience accessors for existing consumers
export const getDefinition = platformRegistry.getPlatform.bind(platformRegistry);
export const getAllDefinitions = platformRegistry.listPlatforms.bind(platformRegistry);
