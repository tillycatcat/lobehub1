import type { PlatformDefinition, PlatformSettingsSchema } from '../types';
import { DiscordClientFactory } from './client';

const settingsSchema: PlatformSettingsSchema = {
  properties: {
    connectionMode: {
      default: 'websocket',
      description: 'How the bot connects to Discord',
      enum: ['websocket', 'webhook'],
      enumLabels: ['WebSocket (Gateway)', 'Webhook'],
      title: 'Connection Mode',
      type: 'string',
    },
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
    showUsageStats: {
      default: false,
      description: 'Show token usage, cost, and duration stats in bot replies',
      title: 'Show Usage Stats',
      type: 'boolean',
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

export const discord: PlatformDefinition = {
  id: 'discord',
  description: 'Connect a Discord bot',
  name: 'Discord',
  documentation: {
    portalUrl: 'https://discord.com/developers/applications',
    setupGuideUrl: 'https://lobehub.com/docs/usage/channels/discord',
  },
  credentials: [
    { key: 'botToken', label: 'Bot Token', required: true, type: 'secret' },
    { key: 'publicKey', label: 'Public Key', required: true, type: 'string' },
    { key: 'applicationId', label: 'Application ID', required: true, type: 'string' },
  ],
  settings: settingsSchema,

  clientFactory: new DiscordClientFactory(),
};
