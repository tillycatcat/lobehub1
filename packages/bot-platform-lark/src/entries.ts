import type { BotPlatformEntry } from '@lobechat/bot-platform-core';

import { larkBotFactory } from './bot';
import { feishuDescriptor, larkDescriptor } from './descriptor';
import { feishuMetadata, larkMetadata } from './metadata';

export const larkWebhookEntry: BotPlatformEntry = {
  platform: 'lark',
  connectionMode: 'webhook',
  descriptor: larkDescriptor,
  createBot: larkBotFactory,
  metadata: larkMetadata,
};

export const feishuWebhookEntry: BotPlatformEntry = {
  platform: 'feishu',
  connectionMode: 'webhook',
  descriptor: feishuDescriptor,
  createBot: larkBotFactory,
  metadata: feishuMetadata,
};

// Future: feishu websocket entry can be added here

export const entries: BotPlatformEntry[] = [larkWebhookEntry, feishuWebhookEntry];
