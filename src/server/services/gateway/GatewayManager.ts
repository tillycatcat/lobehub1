import debug from 'debug';

import { getServerDB } from '@/database/core/db-adaptor';
import { AgentBotProviderModel } from '@/database/models/agentBotProvider';
import { KeyVaultsGateKeeper } from '@/server/modules/KeyVaultsEncrypt';
import {
  type BotProviderConfig,
  buildRuntimeKey,
  type PlatformClient,
  type PlatformDefinition,
} from '@/server/services/bot/platforms';

const log = debug('lobe-server:bot-gateway');

export interface GatewayManagerConfig {
  definitions: PlatformDefinition[];
}

export class GatewayManager {
  private bots = new Map<string, PlatformClient>();
  private running = false;
  private config: GatewayManagerConfig;

  private definitionByPlatform: Map<string, PlatformDefinition>;

  constructor(config: GatewayManagerConfig) {
    this.config = config;
    this.definitionByPlatform = new Map(config.definitions.map((e) => [e.id, e]));
  }

  get isRunning(): boolean {
    return this.running;
  }

  // ------------------------------------------------------------------
  // Lifecycle (call once)
  // ------------------------------------------------------------------

  async start(): Promise<void> {
    if (this.running) {
      log('GatewayManager already running, skipping');
      return;
    }

    log('Starting GatewayManager');

    await this.sync().catch((err) => {
      console.error('[GatewayManager] Initial sync failed:', err);
    });

    this.running = true;
    log('GatewayManager started with %d bots', this.bots.size);
  }

  async stop(): Promise<void> {
    if (!this.running) return;

    log('Stopping GatewayManager');

    for (const [key, bot] of this.bots) {
      log('Stopping bot %s', key);
      await bot.stop();
    }
    this.bots.clear();

    this.running = false;
    log('GatewayManager stopped');
  }

  // ------------------------------------------------------------------
  // Bot operations (point-to-point)
  // ------------------------------------------------------------------

  async startBot(platform: string, applicationId: string, userId: string): Promise<void> {
    const key = buildRuntimeKey(platform, applicationId);

    // Stop existing if any
    const existing = this.bots.get(key);
    if (existing) {
      log('Stopping existing bot %s before restart', key);
      await existing.stop();
      this.bots.delete(key);
    }

    // Load from DB (user-scoped, single row)
    const serverDB = await getServerDB();
    const gateKeeper = await KeyVaultsGateKeeper.initWithEnvKey();
    const model = new AgentBotProviderModel(serverDB, userId, gateKeeper);
    const provider = await model.findEnabledByApplicationId(platform, applicationId);

    if (!provider) {
      log('No enabled provider found for %s', key);
      return;
    }

    const bot = this.createConnector(platform, provider);
    if (!bot) {
      log('Unsupported platform: %s', platform);
      return;
    }

    await bot.start();
    this.bots.set(key, bot);
    log('Started bot %s', key);
  }

  async stopBot(platform: string, applicationId: string): Promise<void> {
    const key = buildRuntimeKey(platform, applicationId);
    const bot = this.bots.get(key);
    if (!bot) return;

    await bot.stop();
    this.bots.delete(key);
    log('Stopped bot %s', key);
  }

  // ------------------------------------------------------------------
  // DB sync
  // ------------------------------------------------------------------

  private async sync(): Promise<void> {
    for (const platform of this.definitionByPlatform.keys()) {
      try {
        await this.syncPlatform(platform);
      } catch (error) {
        console.error('[GatewayManager] Sync error for %s:', platform, error);
      }
    }
  }

  private async syncPlatform(platform: string): Promise<void> {
    const serverDB = await getServerDB();
    const gateKeeper = await KeyVaultsGateKeeper.initWithEnvKey();
    const providers = await AgentBotProviderModel.findEnabledByPlatform(
      serverDB,
      platform,
      gateKeeper,
    );

    log('Sync: found %d enabled providers for %s', providers.length, platform);

    const activeKeys = new Set<string>();

    for (const provider of providers) {
      const { applicationId, credentials } = provider;
      const key = buildRuntimeKey(platform, applicationId);
      activeKeys.add(key);

      log('Sync: processing provider %s, hasCredentials=%s', key, !!credentials);

      const existing = this.bots.get(key);
      if (existing) {
        log('Sync: bot %s already running, skipping', key);
        continue;
      }

      const bot = this.createConnector(platform, provider);
      if (!bot) {
        log('Sync: createConnector returned null for %s', key);
        continue;
      }

      try {
        await bot.start();
        this.bots.set(key, bot);
        log('Sync: started bot %s', key);
      } catch (err) {
        log('Sync: failed to start bot %s: %O', key, err);
      }
    }

    // Stop bots that are no longer in DB
    for (const [key, bot] of this.bots) {
      if (!key.startsWith(`${platform}:`)) continue;
      if (activeKeys.has(key)) continue;

      log('Sync: bot %s removed from DB, stopping', key);
      await bot.stop();
      this.bots.delete(key);
    }
  }

  // ------------------------------------------------------------------
  // Factory
  // ------------------------------------------------------------------

  private createConnector(
    platform: string,
    provider: { applicationId: string; credentials: Record<string, string> },
  ): PlatformClient | null {
    const def = this.definitionByPlatform.get(platform);
    if (!def) {
      log('No definition registered for platform: %s', platform);
      return null;
    }

    const config: BotProviderConfig = {
      applicationId: provider.applicationId,
      credentials: provider.credentials,
      platform,
      settings: {},
    };

    return def.adapterFactory.createClient(config, {});
  }
}

// ------------------------------------------------------------------
// Singleton
// ------------------------------------------------------------------

const globalForGateway = globalThis as unknown as { gatewayManager?: GatewayManager };

export function getGatewayManager(): GatewayManager | undefined {
  return globalForGateway.gatewayManager;
}

export function createGatewayManager(config: GatewayManagerConfig): GatewayManager {
  if (!globalForGateway.gatewayManager) {
    globalForGateway.gatewayManager = new GatewayManager(config);
  }
  return globalForGateway.gatewayManager;
}
