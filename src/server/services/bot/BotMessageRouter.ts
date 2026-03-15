import { createIoRedisState } from '@chat-adapter/state-ioredis';
import {
  type BotPlatformRuntimeContext,
  type BotProviderConfig,
  buildRuntimeKey,
  type PlatformClient,
  type PlatformDefinition,
} from '@lobechat/bot-platform';
import { Chat, ConsoleLogger } from 'chat';
import debug from 'debug';

import { getServerDB } from '@/database/core/db-adaptor';
import type { DecryptedBotProvider } from '@/database/models/agentBotProvider';
import { AgentBotProviderModel } from '@/database/models/agentBotProvider';
import type { LobeChatDatabase } from '@/database/type';
import { getAgentRuntimeRedisClient } from '@/server/modules/AgentRuntime/redis';
import { KeyVaultsGateKeeper } from '@/server/modules/KeyVaultsEncrypt';

import { AgentBridgeService } from './AgentBridgeService';
import { getDefinition } from './platforms';

const log = debug('lobe-server:bot:message-router');

interface ResolvedAgentInfo {
  agentId: string;
  userId: string;
}

interface RegisteredBot {
  agentInfo: ResolvedAgentInfo;
  chatBot: Chat<any>;
  connector: PlatformClient;
}

/**
 * Routes incoming webhook events to the correct Chat SDK Bot instance
 * and triggers message processing via AgentBridgeService.
 *
 * Bots are loaded on-demand: only the bot targeted by the incoming webhook
 * is created, not all bots across all platforms.
 */
export class BotMessageRouter {
  /** botToken → Chat instance (for Discord webhook routing via x-discord-gateway-token) */
  private botInstancesByToken = new Map<string, Chat<any>>();

  /** "platform:applicationId" → registered bot */
  private bots = new Map<string, RegisteredBot>();

  /** Per-key init promises to avoid duplicate concurrent loading */
  private loadingPromises = new Map<string, Promise<RegisteredBot | null>>();

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /**
   * Get the webhook handler for a given platform.
   * Returns a function compatible with Next.js Route Handler: `(req: Request) => Promise<Response>`
   */
  getWebhookHandler(platform: string, appId?: string): (req: Request) => Promise<Response> {
    return async (req: Request) => {
      const entry = getDefinition(platform);
      if (!entry) {
        return new Response('No bot configured for this platform', { status: 404 });
      }

      // Use platform-specific resolver if available (e.g. Discord)
      if (entry.resolveWebhook) {
        return this.handleWithResolver(req, entry);
      }

      // Direct lookup by appId
      return this.handleGenericWebhook(req, platform, appId);
    };
  }

  // ------------------------------------------------------------------
  // Resolver-based webhook routing (Discord, etc.)
  // ------------------------------------------------------------------

  private async handleWithResolver(req: Request, entry: PlatformDefinition): Promise<Response> {
    const platform = entry.id;
    const bodyBuffer = await req.arrayBuffer();
    const clonedReq = this.cloneRequest(req, bodyBuffer);

    // Collect all registered bots for this platform
    const registeredBots = [...this.bots.entries()]
      .filter(([key]) => key.startsWith(`${platform}:`))
      .map(([runtimeKey, rb]) => ({
        config: {
          applicationId: rb.connector.applicationId,
          credentials: {} as Record<string, string>, // credentials are not exposed
          platform,
          settings: {},
        },
        entry,
        runtimeKey,
      }));

    // Try resolver with currently loaded bots
    const resolved = await entry.resolveWebhook!({ registeredBots, request: clonedReq });

    if (resolved) {
      const bot = this.bots.get(resolved.runtimeKey);
      if (bot?.chatBot.webhooks && platform in bot.chatBot.webhooks) {
        return (bot.chatBot.webhooks as any)[platform](this.cloneRequest(req, bodyBuffer));
      }
    }

    // If resolver didn't match, try to extract appId from payload and load on-demand
    const appId = await this.extractAppIdFromPayload(platform, bodyBuffer);
    if (appId) {
      const bot = await this.getOrCreateBot(platform, appId);
      if (bot?.chatBot.webhooks && platform in bot.chatBot.webhooks) {
        return (bot.chatBot.webhooks as any)[platform](this.cloneRequest(req, bodyBuffer));
      }
    }

    // Check gateway token for Discord forwarding
    const gatewayToken = req.headers.get('x-discord-gateway-token');
    if (gatewayToken) {
      const tokenBot = this.botInstancesByToken.get(gatewayToken);
      if (tokenBot?.webhooks && platform in tokenBot.webhooks) {
        return (tokenBot.webhooks as any)[platform](this.cloneRequest(req, bodyBuffer));
      }
    }

    return new Response(`No bot configured for ${platform}`, { status: 404 });
  }

  private async extractAppIdFromPayload(
    platform: string,
    bodyBuffer: ArrayBuffer,
  ): Promise<string | undefined> {
    try {
      const payload = JSON.parse(new TextDecoder().decode(bodyBuffer));

      // Discord: application_id in interaction payload
      if (platform === 'discord') return payload.application_id;

      // Other platforms can add extraction logic here
      return undefined;
    } catch {
      return undefined;
    }
  }

  // ------------------------------------------------------------------
  // Generic webhook routing (Telegram, Feishu, QQ, etc.)
  // ------------------------------------------------------------------

  private async handleGenericWebhook(
    req: Request,
    platform: string,
    appId?: string,
  ): Promise<Response> {
    log('handleGenericWebhook: platform=%s, appId=%s', platform, appId);

    if (!appId) {
      return new Response(`Missing appId for ${platform} webhook`, { status: 400 });
    }

    const bot = await this.getOrCreateBot(platform, appId);
    if (!bot) {
      return new Response(`No bot configured for ${platform}`, { status: 404 });
    }

    if (bot.chatBot.webhooks && platform in bot.chatBot.webhooks) {
      return (bot.chatBot.webhooks as any)[platform](req);
    }

    return new Response(`No bot configured for ${platform}`, { status: 404 });
  }

  private cloneRequest(req: Request, body: ArrayBuffer): Request {
    return new Request(req.url, {
      body,
      headers: req.headers,
      method: req.method,
    });
  }

  // ------------------------------------------------------------------
  // On-demand bot loading
  // ------------------------------------------------------------------

  /**
   * Get an existing bot or create one on-demand from DB.
   * Concurrent calls for the same key are deduplicated.
   */
  private async getOrCreateBot(platform: string, appId: string): Promise<RegisteredBot | null> {
    const key = buildRuntimeKey(platform, appId);

    // Return cached bot
    const existing = this.bots.get(key);
    if (existing) return existing;

    // Deduplicate concurrent loads for the same key
    const inflight = this.loadingPromises.get(key);
    if (inflight) return inflight;

    const promise = this.loadBot(platform, appId);
    this.loadingPromises.set(key, promise);

    try {
      return await promise;
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  private async loadBot(platform: string, appId: string): Promise<RegisteredBot | null> {
    const key = buildRuntimeKey(platform, appId);

    try {
      const entry = getDefinition(platform);
      if (!entry) {
        log('No definition for platform: %s', platform);
        return null;
      }

      const serverDB = await getServerDB();
      const gateKeeper = await KeyVaultsGateKeeper.initWithEnvKey();

      // Find the specific provider — search across all users
      const providers = await AgentBotProviderModel.findEnabledByPlatform(
        serverDB,
        platform,
        gateKeeper,
      );
      const provider = providers.find((p) => p.applicationId === appId);

      if (!provider) {
        log('No enabled provider found for %s', key);
        return null;
      }

      const registered = await this.createAndRegisterBot(entry, provider, serverDB);
      log('Created %s bot on-demand for agent=%s, appId=%s', platform, provider.agentId, appId);
      return registered;
    } catch (error) {
      log('Failed to load bot %s: %O', key, error);
      return null;
    }
  }

  private async createAndRegisterBot(
    entry: PlatformDefinition,
    provider: DecryptedBotProvider,
    serverDB: LobeChatDatabase,
  ): Promise<RegisteredBot> {
    const { agentId, userId, applicationId, credentials } = provider;
    const platform = entry.id;
    const key = buildRuntimeKey(platform, applicationId);

    const providerConfig: BotProviderConfig = {
      applicationId,
      credentials,
      platform,
      settings: (provider.settings as Record<string, unknown>) || {},
    };

    const runtimeContext: BotPlatformRuntimeContext = {
      appUrl: process.env.APP_URL,
      redisClient: getAgentRuntimeRedisClient() as any,
    };

    const connector = entry.adapterFactory.createClient(providerConfig, runtimeContext);
    const adapters = connector.createAdapter();

    const chatBot = this.createChatBot(adapters, `agent-${agentId}`);
    this.registerHandlers(chatBot, serverDB, connector, {
      agentId,
      applicationId,
      platform,
      settings: provider.settings as Record<string, any> | undefined,
      userId,
    });
    await chatBot.initialize();

    const registered: RegisteredBot = {
      agentInfo: { agentId, userId },
      chatBot,
      connector,
    };

    this.bots.set(key, registered);

    // Platform-specific post-registration hook (e.g. Discord token index)
    await connector.onRegistered?.({
      registerByToken: (token: string) => this.botInstancesByToken.set(token, chatBot),
    });

    return registered;
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  /**
   * A proxy around the shared Redis client that suppresses duplicate `on('error', ...)`
   * registrations. Each `createIoRedisState()` call adds an error listener to the client;
   * with many bot instances sharing one client this would trigger
   * MaxListenersExceededWarning. The proxy lets the first error listener through and
   * silently drops subsequent ones, so it scales to any number of bots.
   */
  private sharedRedisProxy: ReturnType<typeof getAgentRuntimeRedisClient> | undefined;

  private getSharedRedisProxy() {
    if (this.sharedRedisProxy !== undefined) return this.sharedRedisProxy;

    const redisClient = getAgentRuntimeRedisClient();
    if (!redisClient) {
      this.sharedRedisProxy = null;
      return null;
    }

    let errorListenerRegistered = false;
    this.sharedRedisProxy = new Proxy(redisClient, {
      get(target, prop, receiver) {
        if (prop === 'on') {
          return (event: string, listener: (...args: any[]) => void) => {
            if (event === 'error') {
              if (errorListenerRegistered) return target;
              errorListenerRegistered = true;
            }
            return target.on(event, listener);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    return this.sharedRedisProxy;
  }

  private createChatBot(adapters: Record<string, any>, label: string): Chat<any> {
    const config: any = {
      adapters,
      userName: `lobehub-bot-${label}`,
    };

    const redisProxy = this.getSharedRedisProxy();
    if (redisProxy) {
      config.state = createIoRedisState({
        client: redisProxy,
        keyPrefix: `chat-sdk:${label}`,
        logger: new ConsoleLogger(),
      });
    }

    return new Chat(config);
  }

  private registerHandlers(
    bot: Chat<any>,
    serverDB: LobeChatDatabase,
    connector: PlatformClient,
    info: ResolvedAgentInfo & {
      applicationId: string;
      platform: string;
      settings?: Record<string, any>;
    },
  ): void {
    const { agentId, applicationId, platform, userId } = info;
    const bridge = new AgentBridgeService(serverDB, userId);

    bot.onNewMention(async (thread, message) => {
      log(
        'onNewMention: agent=%s, platform=%s, author=%s, thread=%s',
        agentId,
        platform,
        message.author.userName,
        thread.id,
      );
      await bridge.handleMention(thread, message, {
        agentId,
        botContext: { applicationId, platform, platformThreadId: thread.id },
        connector,
      });
    });

    bot.onSubscribedMessage(async (thread, message) => {
      if (message.author.isBot === true) return;

      log(
        'onSubscribedMessage: agent=%s, platform=%s, author=%s, thread=%s',
        agentId,
        platform,
        message.author.userName,
        thread.id,
      );

      await bridge.handleSubscribedMessage(thread, message, {
        agentId,
        botContext: { applicationId, platform, platformThreadId: thread.id },
        connector,
      });
    });

    // Register onNewMessage handler based on platform config
    const dmEnabled = info.settings?.dm?.enabled ?? false;
    if (dmEnabled) {
      bot.onNewMessage(/./, async (thread, message) => {
        if (message.author.isBot === true) return;

        log(
          'onNewMessage (%s catch-all): agent=%s, author=%s, thread=%s, text=%s',
          platform,
          agentId,
          message.author.userName,
          thread.id,
          message.text?.slice(0, 80),
        );

        await bridge.handleMention(thread, message, {
          agentId,
          botContext: { applicationId, platform, platformThreadId: thread.id },
          connector,
        });
      });
    }
  }
}

// ------------------------------------------------------------------
// Singleton
// ------------------------------------------------------------------

let instance: BotMessageRouter | null = null;

export function getBotMessageRouter(): BotMessageRouter {
  if (!instance) {
    instance = new BotMessageRouter();
  }
  return instance;
}
