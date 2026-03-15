import type { PlatformDefinition, PlatformSettingsSchema } from '../../types';
import { qqClientFactory } from './client';

const settingsSchema: PlatformSettingsSchema = {
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

export const qqWebhook: PlatformDefinition = {
  platform: 'qq',
  connectionMode: 'webhook',
  description: 'Connect a QQ bot via webhook',
  displayName: 'QQ',
  portalUrl: 'https://q.qq.com/',

  credentials: [
    { key: 'appId', label: 'App ID', required: true, type: 'string' },
    { key: 'appSecret', label: 'App Secret', required: true, type: 'secret' },
  ],
  settings: settingsSchema,

  createClient: qqClientFactory,
};
