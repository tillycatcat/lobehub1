import { createQQAdapter, QQApiClient } from '@lobechat/adapter-qq';
import debug from 'debug';

import type {
  BotPlatformRuntimeContext,
  BotProviderConfig,
  PlatformBot,
  PlatformBotFactory,
  PlatformMessenger,
} from '../../types';

const log = debug('bot-platform:qq:bot');

function extractChatId(platformThreadId: string): string {
  return platformThreadId.split(':')[2];
}

function extractThreadType(platformThreadId: string): string {
  return platformThreadId.split(':')[1] || 'group';
}

async function sendQQMessage(
  api: QQApiClient,
  threadType: string,
  targetId: string,
  content: string,
): Promise<void> {
  switch (threadType) {
    case 'group': {
      await api.sendGroupMessage(targetId, content);
      return;
    }
    case 'guild': {
      await api.sendGuildMessage(targetId, content);
      return;
    }
    case 'c2c': {
      await api.sendC2CMessage(targetId, content);
      return;
    }
    case 'dms': {
      await api.sendDmsMessage(targetId, content);
      return;
    }
    default: {
      await api.sendGroupMessage(targetId, content);
    }
  }
}

class QQWebhookBot implements PlatformBot {
  readonly platform = 'qq';
  readonly applicationId: string;

  private config: BotProviderConfig;

  constructor(config: BotProviderConfig, _context: BotPlatformRuntimeContext) {
    this.config = config;
    this.applicationId = config.applicationId;
  }

  // --- Lifecycle ---

  async start(): Promise<void> {
    log('Starting QQBot appId=%s', this.applicationId);

    // Verify credentials by fetching an access token
    const api = new QQApiClient(this.config.credentials.appId, this.config.credentials.appSecret);
    await api.getAccessToken();

    log('QQBot appId=%s credentials verified', this.applicationId);
  }

  async stop(): Promise<void> {
    log('Stopping QQBot appId=%s', this.applicationId);
    // No cleanup needed — webhook is configured in QQ Open Platform
  }

  // --- Runtime Operations ---

  createAdapter(): Record<string, any> {
    return {
      qq: createQQAdapter({
        appId: this.config.credentials.appId,
        clientSecret: this.config.credentials.appSecret,
      }),
    };
  }

  getMessenger(platformThreadId: string): PlatformMessenger {
    const api = new QQApiClient(this.config.credentials.appId, this.config.credentials.appSecret);
    const targetId = extractChatId(platformThreadId);
    const threadType = extractThreadType(platformThreadId);
    return {
      createMessage: (content) => sendQQMessage(api, threadType, targetId, content),
      editMessage: (_messageId, content) =>
        // QQ does not support editing — send a new message as fallback
        sendQQMessage(api, threadType, targetId, content),
      // QQ Bot API doesn't support reactions or typing
      removeReaction: () => Promise.resolve(),
      triggerTyping: () => Promise.resolve(),
    };
  }

  extractChatId(platformThreadId: string): string {
    return extractChatId(platformThreadId);
  }

  parseMessageId(compositeId: string): string {
    return compositeId;
  }
}

export const qqBotFactory: PlatformBotFactory = (
  account: BotProviderConfig,
  context: BotPlatformRuntimeContext,
): PlatformBot => {
  return new QQWebhookBot(account, context);
};
