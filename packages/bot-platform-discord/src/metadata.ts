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
        enabled: { default: false, title: 'Enable DMs', type: 'boolean' },
        policy: {
          default: 'disabled',
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

export const discordMetadata: BotPlatformMetadata = {
  credentials: [
    {
      key: 'botToken',
      label: 'Bot Token',
      required: true,
      type: 'secret',
    },
    {
      key: 'publicKey',
      label: 'Public Key',
      required: true,
      type: 'string',
    },
    {
      key: 'applicationId',
      label: 'Application ID',
      required: true,
      type: 'string',
    },
  ],
  displayName: 'Discord',
  settingsSchema: platformConfig,
  supportsDirectMessages: true,
  supportsEditMessage: true,
  supportsReaction: true,
  supportsThreadRename: true,
  supportsTyping: true,
};
