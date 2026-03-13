import { QQApiClient } from '@lobechat/adapter-qq';
import type {
  BotPlatformRuntimeContext,
  BotProviderConfig,
  PlatformBot,
  PlatformBotFactory,
} from '@lobechat/bot-platform-core';
import debug from 'debug';

const log = debug('bot-platform:qq:bot');

class QQWebhookBot implements PlatformBot {
  readonly platform = 'qq';
  readonly applicationId: string;

  private config: BotProviderConfig;

  constructor(config: BotProviderConfig, _context: BotPlatformRuntimeContext) {
    this.config = config;
    this.applicationId = config.applicationId;
  }

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
}

export const qqBotFactory: PlatformBotFactory = (
  account: BotProviderConfig,
  context: BotPlatformRuntimeContext,
): PlatformBot => {
  return new QQWebhookBot(account, context);
};
