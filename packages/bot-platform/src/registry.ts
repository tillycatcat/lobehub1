import type {
  BotPlatformRuntimeContext,
  BotProviderConfig,
  PlatformClient,
  PlatformDefinition,
  ValidationResult,
} from './types';

/**
 * Platform registry — manages all platform definitions and adapter factories.
 *
 * Integrates with chat-sdk's Chat class by providing adapter creation
 * and credential validation through the registered AdapterFactory instances.
 */
export class PlatformRegistry {
  private platforms = new Map<string, PlatformDefinition>();

  /** Register a platform definition. Throws if the platform ID is already registered. */
  register(definition: PlatformDefinition): this {
    if (this.platforms.has(definition.id)) {
      throw new Error(`Platform "${definition.id}" is already registered`);
    }
    this.platforms.set(definition.id, definition);
    return this;
  }

  /** Get a platform definition by ID. */
  getPlatform(platform: string): PlatformDefinition | undefined {
    return this.platforms.get(platform);
  }

  /** List all registered platform definitions. */
  listPlatforms(): PlatformDefinition[] {
    return [...this.platforms.values()];
  }

  /** List all registered platform IDs. */
  listPlatformIds(): string[] {
    return [...this.platforms.keys()];
  }

  /** Check whether a platform is registered. */
  has(platform: string): boolean {
    return this.platforms.has(platform);
  }

  /**
   * Create a PlatformClient for a given platform.
   *
   * Looks up the platform definition and delegates to its adapterFactory.
   * Throws if the platform is not registered.
   */
  createClient(
    platform: string,
    config: BotProviderConfig,
    context?: BotPlatformRuntimeContext,
  ): PlatformClient {
    const definition = this.platforms.get(platform);
    if (!definition) {
      throw new Error(`Platform "${platform}" is not registered`);
    }
    return definition.adapterFactory.createClient(config, context ?? {});
  }

  /**
   * Validate credentials for a given platform.
   *
   * Delegates to the platform's adapterFactory.validateCredentials if available.
   * Returns `{ valid: true }` if the platform does not implement validation.
   */
  async validateCredentials(
    platform: string,
    credentials: Record<string, string>,
    settings?: Record<string, unknown>,
  ): Promise<ValidationResult> {
    const definition = this.platforms.get(platform);
    if (!definition) {
      return {
        errors: [{ field: 'platform', message: `Platform "${platform}" is not registered` }],
        valid: false,
      };
    }
    if (!definition.adapterFactory.validateCredentials) {
      return { valid: true };
    }
    return definition.adapterFactory.validateCredentials(credentials, settings);
  }
}

// --------------- Key helpers ---------------

/**
 * Build a runtime key for a registered bot instance.
 * Format: `platform:applicationId`
 */
export function buildRuntimeKey(entry: PlatformDefinition, applicationId: string): string {
  return `${entry.id}:${applicationId}`;
}

/**
 * Parse a runtime key back into its components.
 */
export function parseRuntimeKey(key: string): {
  applicationId: string;
  platform: string;
} {
  const [platform, applicationId] = key.split(':');
  return { applicationId, platform };
}
