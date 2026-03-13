import type { BotPlatformEntry } from '@lobechat/bot-platform-core';

import { telegramBotFactory } from './bot';
import { telegramDescriptor } from './descriptor';
import { telegramMetadata } from './metadata';

export const telegramWebhookEntry: BotPlatformEntry = {
  platform: 'telegram',
  connectionMode: 'webhook',
  descriptor: telegramDescriptor,
  createBot: telegramBotFactory,
  metadata: telegramMetadata,
};

export const entries: BotPlatformEntry[] = [telegramWebhookEntry];
