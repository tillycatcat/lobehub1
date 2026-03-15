import {
  discordWebsocket,
  feishuWebhook,
  larkWebhook,
  type PlatformDefinition,
  qqWebhook,
  telegramWebhook,
} from '@lobechat/bot-platform';

const allDefinitions: PlatformDefinition[] = [
  discordWebsocket,
  telegramWebhook,
  larkWebhook,
  feishuWebhook,
  qqWebhook,
];

/** Look up platform definition by platform name. */
const definitionByPlatform = new Map<string, PlatformDefinition>(
  allDefinitions.map((d) => [d.platform, d]),
);

export function getDefinition(platform: string): PlatformDefinition | undefined {
  return definitionByPlatform.get(platform);
}

export function getAllDefinitions(): PlatformDefinition[] {
  return allDefinitions;
}

export function getAllPlatforms(): string[] {
  return allDefinitions.map((d) => d.platform);
}
