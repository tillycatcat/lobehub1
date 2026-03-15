import type { PlatformDefinition, PlatformSettingsSchema } from '../types';
import { TelegramAdapterFactory } from './client';

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
  },
  type: 'object',
};

export const telegram: PlatformDefinition = {
  id: 'telegram',
  description: 'Connect a Telegram bot',
  name: 'Telegram',
  documentation: {
    portalUrl: 'https://t.me/BotFather',
    setupGuideUrl: 'https://lobehub.com/docs/usage/channels/telegram',
  },

  credentials: [
    { key: 'botToken', label: 'Bot Token', required: true, type: 'secret' },
    {
      key: 'secretToken',
      label: 'Webhook Secret Token',
      description: 'Optional secret token for webhook verification',
      required: false,
      type: 'secret',
    },
    {
      key: 'webhookProxyUrl',
      label: 'Webhook Proxy URL',
      description: 'HTTPS proxy URL for local development (e.g. Cloudflare tunnel)',
      required: false,
      type: 'string',
    },
  ],
  settings: settingsSchema,

  adapterFactory: new TelegramAdapterFactory(),
};
