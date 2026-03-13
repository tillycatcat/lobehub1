import type { BotPlatformMetadata, PlatformConfigSchema } from '@lobechat/bot-platform-core';

const platformConfig: PlatformConfigSchema = {
  properties: {
    charLimit: {
      default: 2000,
      minimum: 100,
      title: 'Character Limit',
      type: 'number',
    },
    debounceMs: {
      default: 2000,
      description: 'How long to wait for additional messages before dispatching to the agent (ms)',
      minimum: 0,
      title: 'Message Merge Window (ms)',
      type: 'number',
    },
    dm: {
      properties: {
        enabled: { default: true, title: 'Enable DMs', type: 'boolean' },
        policy: {
          default: 'open',
          enum: ['open', 'allowlist', 'disabled'],
          enumLabels: ['Open', 'Allowlist', 'Disabled'],
          title: 'DM Policy',
          type: 'string',
        },
      },
      title: 'Direct Messages',
      type: 'object',
    },
  },
  type: 'object',
};

export const qqMetadata: BotPlatformMetadata = {
  credentials: [
    {
      key: 'appId',
      label: 'App ID',
      required: true,
      type: 'string',
    },
    {
      key: 'appSecret',
      label: 'App Secret',
      required: true,
      type: 'secret',
    },
  ],
  displayName: 'QQ',
  settingsSchema: platformConfig,
  supportsDirectMessages: true,
  supportsEditMessage: false,
  supportsReaction: false,
  supportsThreadRename: false,
  supportsTyping: false,
};
