import type { PlatformDefinition, PlatformSettingsSchema } from '../types';
import { FeishuClientFactory } from './client';

const settingsSchema: PlatformSettingsSchema = {
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
    domain: {
      default: 'feishu',
      description: 'Lark (international) tenants should set this to "lark"',
      enum: ['feishu', 'lark'],
      enumLabels: ['飞书 (China)', 'Lark (International)'],
      title: 'Domain',
      type: 'string',
    },
  },
  type: 'object',
};

export const feishu: PlatformDefinition = {
  id: 'feishu',
  description: 'Connect a Feishu / Lark bot',
  name: 'Feishu / Lark',
  documentation: {
    portalUrl: 'https://open.feishu.cn/app',
    setupGuideUrl: 'https://lobehub.com/docs/usage/channels/feishu',
  },

  credentials: [
    { key: 'appId', label: 'App ID', required: true, type: 'string' },
    { key: 'appSecret', label: 'App Secret', required: true, type: 'secret' },
    {
      key: 'encryptKey',
      label: 'Encrypt Key',
      description: 'AES decrypt key for encrypted events (optional)',
      required: false,
      type: 'secret',
    },
    {
      key: 'verificationToken',
      label: 'Verification Token',
      description: 'Token for webhook event validation (optional)',
      required: false,
      type: 'secret',
    },
  ],
  settings: settingsSchema,

  clientFactory: new FeishuClientFactory(),
};
