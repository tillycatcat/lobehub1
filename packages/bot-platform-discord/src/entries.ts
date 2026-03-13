import type { BotPlatformEntry } from '@lobechat/bot-platform-core';

import { discordBotFactory } from './bot';
import { discordDescriptor } from './descriptor';
import { discordMetadata } from './metadata';
import { discordWebhookResolver } from './resolveWebhook';

export const discordWebsocketEntry: BotPlatformEntry = {
  platform: 'discord',
  connectionMode: 'websocket',
  descriptor: discordDescriptor,
  createBot: discordBotFactory,
  metadata: discordMetadata,
  resolveWebhook: discordWebhookResolver,
};

export const entries: BotPlatformEntry[] = [discordWebsocketEntry];
