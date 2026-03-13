import { LarkApiClient } from '@lobechat/adapter-lark';
import type {
  BotPlatformRuntimeContext,
  BotProviderConfig,
  PlatformBot,
  PlatformBotFactory,
} from '@lobechat/bot-platform-core';
import debug from 'debug';

const log = debug('bot-platform:lark:bot');

class LarkWebhookBot implements PlatformBot {
  readonly platform: string;
  readonly applicationId: string;

  private config: BotProviderConfig;

  constructor(config: BotProviderConfig, _context: BotPlatformRuntimeContext) {
    this.config = config;
    this.applicationId = config.applicationId;
    this.platform = config.platform;
  }

  async start(): Promise<void> {
    log('Starting LarkBot appId=%s platform=%s', this.applicationId, this.platform);

    // Verify credentials by fetching a tenant access token
    const api = new LarkApiClient(
      this.config.credentials.appId,
      this.config.credentials.appSecret,
      this.platform,
    );
    await api.getTenantAccessToken();

    log('LarkBot appId=%s credentials verified', this.applicationId);
  }

  async stop(): Promise<void> {
    log('Stopping LarkBot appId=%s', this.applicationId);
    // No cleanup needed — webhook is managed in Lark Developer Console
  }
}

export const larkBotFactory: PlatformBotFactory = (
  account: BotProviderConfig,
  context: BotPlatformRuntimeContext,
): PlatformBot => {
  return new LarkWebhookBot(account, context);
};
