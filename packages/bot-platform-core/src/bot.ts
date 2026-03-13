import type { PlatformBot } from './types';

// --------------- Provider Config ---------------

/**
 * Represents a concrete bot configuration instance under a platform entry.
 * Corresponds to a row in the `agentBotProviders` table.
 */
export interface BotProviderConfig {
  applicationId: string;
  connectionMode: string;
  credentials: Record<string, string>;
  platform: string;
}

// --------------- Runtime Context ---------------

/**
 * Minimal Redis client interface for platform bot dependencies.
 * Platform packages should depend on this interface instead of importing
 * server-private modules directly.
 */
export interface BotPlatformRedisClient {
  del: (key: string) => Promise<number>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { ex?: number }) => Promise<string | null>;
  subscribe?: (channel: string, callback: (message: string) => void) => Promise<void>;
}

/**
 * Runtime context injected by the server layer into platform bot factories.
 * Keeps platform packages decoupled from server-private modules.
 */
export interface BotPlatformRuntimeContext {
  appUrl?: string;
  redisClient?: BotPlatformRedisClient;
  registerByToken?: (token: string) => void;
}

// --------------- Bot Factory ---------------

/**
 * Factory function that creates a `PlatformBot` instance for a given account
 * and runtime context. Exported by platform packages as part of `BotPlatformEntry`.
 */
export type PlatformBotFactory = (
  account: BotProviderConfig,
  context: BotPlatformRuntimeContext,
) => PlatformBot;
