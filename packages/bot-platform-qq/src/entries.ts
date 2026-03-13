import type { BotPlatformEntry } from '@lobechat/bot-platform-core';

import { qqBotFactory } from './bot';
import { qqDescriptor } from './descriptor';
import { qqMetadata } from './metadata';

export const qqWebhookEntry: BotPlatformEntry = {
  platform: 'qq',
  connectionMode: 'webhook',
  descriptor: qqDescriptor,
  createBot: qqBotFactory,
  metadata: qqMetadata,
};

export const entries: BotPlatformEntry[] = [qqWebhookEntry];
