import type { BotPlatformMetadata, PlatformConfigSchema } from '@lobechat/bot-platform-core';

const sharedCredentials = [
  {
    key: 'appId',
    label: 'App ID',
    required: true,
    type: 'string' as const,
  },
  {
    key: 'appSecret',
    label: 'App Secret',
    required: true,
    type: 'secret' as const,
  },
  {
    key: 'encryptKey',
    label: 'Encrypt Key',
    description: 'AES decrypt key for encrypted events (optional)',
    required: false,
    type: 'secret' as const,
  },
  {
    key: 'verificationToken',
    label: 'Verification Token',
    description: 'Token for webhook event validation (optional)',
    required: false,
    type: 'secret' as const,
  },
];

const sharedCapabilities = {
  supportsDirectMessages: true,
  supportsEditMessage: true,
  supportsReaction: false,
  supportsThreadRename: false,
  supportsTyping: false,
};

const sharedPlatformConfig: PlatformConfigSchema = {
  properties: {
    charLimit: {
      default: 4000,
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

export const larkMetadata: BotPlatformMetadata = {
  credentials: sharedCredentials,
  displayName: 'Lark',
  settingsSchema: sharedPlatformConfig,
  ...sharedCapabilities,
};

export const feishuMetadata: BotPlatformMetadata = {
  credentials: sharedCredentials,
  displayName: '飞书',
  settingsSchema: sharedPlatformConfig,
  ...sharedCapabilities,
};
