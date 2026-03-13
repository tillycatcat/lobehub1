import type {
  BotPlatformRuntimeContext,
  BotProviderConfig,
  PlatformBot,
  PlatformBotFactory,
} from '@lobechat/bot-platform-core';
import debug from 'debug';

import { TELEGRAM_API_BASE } from './client';
import { extractBotId, setTelegramWebhook } from './descriptor';

const log = debug('bot-platform:telegram:bot');

class TelegramWebhookBot implements PlatformBot {
  readonly platform = 'telegram';
  readonly applicationId: string;

  private config: BotProviderConfig;
  private context: BotPlatformRuntimeContext;

  constructor(config: BotProviderConfig, context: BotPlatformRuntimeContext) {
    this.config = config;
    this.context = context;
    this.applicationId = extractBotId(config.credentials.botToken);
  }

  async start(): Promise<void> {
    log('Starting TelegramBot appId=%s', this.applicationId);

    const baseUrl = (this.config.credentials.webhookProxyUrl || this.context.appUrl || '')
      .trim()
      .replace(/\/$/, '');
    const webhookUrl = `${baseUrl}/api/agent/webhooks/telegram/${this.applicationId}`;
    await setTelegramWebhook(
      this.config.credentials.botToken,
      webhookUrl,
      this.config.credentials.secretToken,
    );

    log('TelegramBot appId=%s started, webhook=%s', this.applicationId, webhookUrl);
  }

  async stop(): Promise<void> {
    log('Stopping TelegramBot appId=%s', this.applicationId);
    try {
      const response = await fetch(
        `${TELEGRAM_API_BASE}/bot${this.config.credentials.botToken}/deleteWebhook`,
        { method: 'POST' },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to delete Telegram webhook: ${response.status} ${text}`);
      }
      log('TelegramBot appId=%s webhook deleted', this.applicationId);
    } catch (error) {
      log('Failed to delete webhook for appId=%s: %O', this.applicationId, error);
    }
  }
}

export const telegramBotFactory: PlatformBotFactory = (
  account: BotProviderConfig,
  context: BotPlatformRuntimeContext,
): PlatformBot => {
  return new TelegramWebhookBot(account, context);
};
