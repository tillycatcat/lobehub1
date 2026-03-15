import { createLarkAdapter, LarkApiClient } from '@lobechat/chat-adapter-lark';
import debug from 'debug';

import type {
  BotPlatformRuntimeContext,
  BotProviderConfig,
  PlatformClient,
  PlatformClientFactory,
  PlatformMessenger,
} from '../../types';

const log = debug('bot-platform:lark:bot');

function extractChatId(platformThreadId: string): string {
  return platformThreadId.split(':')[1];
}

class LarkWebhookClient implements PlatformClient {
  readonly platform: string;
  readonly applicationId: string;

  private config: BotProviderConfig;

  constructor(config: BotProviderConfig, _context: BotPlatformRuntimeContext) {
    this.config = config;
    this.applicationId = config.applicationId;
    this.platform = config.platform;
  }

  // --- Lifecycle ---

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

  // --- Runtime Operations ---

  createAdapter(): Record<string, any> {
    return {
      [this.platform]: createLarkAdapter({
        appId: this.config.credentials.appId,
        appSecret: this.config.credentials.appSecret,
        encryptKey: this.config.credentials.encryptKey,
        platform: this.platform as 'lark' | 'feishu',
        verificationToken: this.config.credentials.verificationToken,
      }),
    };
  }

  getMessenger(platformThreadId: string): PlatformMessenger {
    const api = new LarkApiClient(
      this.config.credentials.appId,
      this.config.credentials.appSecret,
      this.platform,
    );
    const chatId = extractChatId(platformThreadId);
    return {
      createMessage: (content) => api.sendMessage(chatId, content).then(() => {}),
      editMessage: (messageId, content) => api.editMessage(messageId, content).then(() => {}),
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

export const larkClientFactory: PlatformClientFactory = (
  account: BotProviderConfig,
  context: BotPlatformRuntimeContext,
): PlatformClient => {
  return new LarkWebhookClient(account, context);
};
