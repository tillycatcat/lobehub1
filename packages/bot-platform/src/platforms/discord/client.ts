import type { DiscordAdapter } from '@chat-adapter/discord';
import { createDiscordAdapter } from '@chat-adapter/discord';
import debug from 'debug';

import type {
  BotPlatformRuntimeContext,
  BotProviderConfig,
  PlatformClient,
  PlatformClientFactory,
  PlatformMessenger,
  UsageStats,
} from '../../types';
import { formatUsageStats } from '../../utils';
import { DiscordApi } from './api';

const log = debug('bot-platform:discord:bot');

const DEFAULT_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface GatewayListenerOptions {
  durationMs?: number;
  waitUntil?: (task: Promise<any>) => void;
}

function extractChannelId(platformThreadId: string): string {
  const parts = platformThreadId.split(':');
  return parts[3] || parts[2];
}

class DiscordGatewayClient implements PlatformClient {
  readonly platform = 'discord';
  readonly applicationId: string;

  private abort = new AbortController();
  private config: BotProviderConfig;
  private context: BotPlatformRuntimeContext;
  private discord: DiscordApi;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(config: BotProviderConfig, context: BotPlatformRuntimeContext) {
    this.config = config;
    this.context = context;
    this.applicationId = config.applicationId;
    this.discord = new DiscordApi(config.credentials.botToken);
  }

  // --- Lifecycle ---

  async start(options?: GatewayListenerOptions): Promise<void> {
    log('Starting DiscordBot appId=%s', this.applicationId);

    this.stopped = false;
    this.abort = new AbortController();

    const adapter = createDiscordAdapter({
      applicationId: this.config.applicationId,
      botToken: this.config.credentials.botToken,
      publicKey: this.config.credentials.publicKey,
    });

    const { Chat, ConsoleLogger } = await import('chat');

    const chatConfig: any = {
      adapters: { discord: adapter },
      userName: `lobehub-gateway-${this.applicationId}`,
    };

    if (this.context.redisClient) {
      const { createIoRedisState } = await import('@chat-adapter/state-ioredis');
      chatConfig.state = createIoRedisState({
        client: this.context.redisClient as any,
        logger: new ConsoleLogger(),
      });
    }

    const bot = new Chat(chatConfig);
    await bot.initialize();

    const discordAdapter = (bot as any).adapters.get('discord') as DiscordAdapter;
    const durationMs = options?.durationMs ?? DEFAULT_DURATION_MS;
    const waitUntil = options?.waitUntil ?? ((task: Promise<any>) => task.catch(() => {}));

    const webhookUrl = `${(this.context.appUrl || '').trim()}/api/agent/webhooks/discord`;

    await discordAdapter.startGatewayListener(
      { waitUntil },
      durationMs,
      this.abort.signal,
      webhookUrl,
    );

    if (!options) {
      this.refreshTimer = setTimeout(() => {
        if (this.abort.signal.aborted || this.stopped) return;

        log(
          'DiscordBot appId=%s duration elapsed (%dh), refreshing...',
          this.applicationId,
          durationMs / 3_600_000,
        );
        this.abort.abort();
        this.start().catch((err) => {
          log('Failed to refresh DiscordBot appId=%s: %O', this.applicationId, err);
        });
      }, durationMs);
    }

    log('DiscordBot appId=%s started, webhookUrl=%s', this.applicationId, webhookUrl);
  }

  async stop(): Promise<void> {
    log('Stopping DiscordBot appId=%s', this.applicationId);
    this.stopped = true;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.abort.abort();
  }

  // --- Runtime Operations ---

  createAdapter(): Record<string, any> {
    return {
      discord: createDiscordAdapter({
        applicationId: this.config.applicationId,
        botToken: this.config.credentials.botToken,
        publicKey: this.config.credentials.publicKey,
      }),
    };
  }

  getMessenger(platformThreadId: string): PlatformMessenger {
    const channelId = extractChannelId(platformThreadId);
    return {
      createMessage: (content) => this.discord.createMessage(channelId, content).then(() => {}),
      editMessage: (messageId, content) => this.discord.editMessage(channelId, messageId, content),
      removeReaction: (messageId, emoji) =>
        this.discord.removeOwnReaction(channelId, messageId, emoji),
      triggerTyping: () => this.discord.triggerTyping(channelId),
      updateThreadName: (name) => {
        const threadId = platformThreadId.split(':')[3];
        return threadId ? this.discord.updateChannelName(threadId, name) : Promise.resolve();
      },
    };
  }

  extractChatId(platformThreadId: string): string {
    return extractChannelId(platformThreadId);
  }

  formatReply(body: string, stats?: UsageStats): string {
    if (!stats || !this.config.settings?.showUsageStats) return body;
    return `${body}\n\n-# ${formatUsageStats(stats)}`;
  }

  parseMessageId(compositeId: string): string {
    return compositeId;
  }

  sanitizeUserInput(text: string): string {
    return text.replaceAll(new RegExp(`<@!?${this.applicationId}>\\s*`, 'g'), '').trim();
  }

  shouldSubscribe(threadId: string): boolean {
    // Only auto-subscribe to actual threads (4-part ID), not top-level channels (3-part ID).
    const parts = threadId.split(':');
    return parts.length >= 4;
  }

  async onRegistered(context: { registerByToken?: (token: string) => void }): Promise<void> {
    if (this.config.credentials.botToken && context.registerByToken) {
      context.registerByToken(this.config.credentials.botToken);
    }
  }
}

export const discordClientFactory: PlatformClientFactory = (
  account: BotProviderConfig,
  context: BotPlatformRuntimeContext,
): PlatformClient => {
  return new DiscordGatewayClient(account, context);
};
