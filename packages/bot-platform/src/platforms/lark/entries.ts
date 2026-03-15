import type { BotPlatformEntry, PlatformSettingsSchema } from '../../types';
import { larkBotFactory } from './bot';

const sharedSettingsSchema: PlatformSettingsSchema = {
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

const sharedCredentials = [
  { key: 'appId', label: 'App ID', required: true, type: 'string' as const },
  { key: 'appSecret', label: 'App Secret', required: true, type: 'secret' as const },
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

function createLarkEntry(
  platform: 'lark' | 'feishu',
  displayName: string,
  description: string,
  portalUrl: string,
): BotPlatformEntry {
  return {
    platform,
    connectionMode: 'webhook',
    description,
    displayName,
    portalUrl,

    credentials: sharedCredentials,
    settings: sharedSettingsSchema,

    createBot: larkBotFactory,
  };
}

export const larkWebhookEntry = createLarkEntry(
  'lark',
  'Lark',
  'Connect a Lark bot via webhook',
  'https://open.larksuite.com/app',
);
export const feishuWebhookEntry = createLarkEntry(
  'feishu',
  '飞书',
  '通过 Webhook 连接飞书机器人',
  'https://open.feishu.cn/app',
);
