import type { DiscordAdapter } from '@chat-adapter/discord';
import { createDiscordAdapter } from '@chat-adapter/discord';
import type {
  BotPlatformRuntimeContext,
  BotProviderConfig,
  PlatformBot,
  PlatformBotFactory,
} from '@lobechat/bot-platform-core';
import debug from 'debug';

const log = debug('bot-platform:discord:bot');

const DEFAULT_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface GatewayListenerOptions {
  durationMs?: number;
  waitUntil?: (task: Promise<any>) => void;
}

class DiscordGatewayBot implements PlatformBot {
  readonly platform = 'discord';
  readonly applicationId: string;

  private abort = new AbortController();
  private config: BotProviderConfig;
  private context: BotPlatformRuntimeContext;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(config: BotProviderConfig, context: BotPlatformRuntimeContext) {
    this.config = config;
    this.context = context;
    this.applicationId = config.applicationId;
  }

  async start(options?: GatewayListenerOptions): Promise<void> {
    log('Starting DiscordBot appId=%s', this.applicationId);

    this.stopped = false;
    this.abort = new AbortController();

    const adapter = createDiscordAdapter({
      applicationId: this.config.applicationId,
      botToken: this.config.credentials.botToken,
      publicKey: this.config.credentials.publicKey,
    });

    // Dynamic import to avoid hard dependency on chat SDK at package level
    const { Chat, ConsoleLogger } = await import('chat');

    const chatConfig: any = {
      adapters: { discord: adapter },
      userName: `lobehub-gateway-${this.applicationId}`,
    };

    if (this.context.redisClient) {
      const { createIoRedisState } = await import('@chat-adapter/state-ioredis');
      chatConfig.state = createIoRedisState({
        // redisClient is a minimal interface; at runtime the server injects
        // a real ioredis instance that satisfies createIoRedisState's expectations
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

    // Only schedule refresh timer in long-running mode (no custom options)
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
}

export const discordBotFactory: PlatformBotFactory = (
  account: BotProviderConfig,
  context: BotPlatformRuntimeContext,
): PlatformBot => {
  return new DiscordGatewayBot(account, context);
};
