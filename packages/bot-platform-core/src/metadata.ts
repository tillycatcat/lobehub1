import type { PlatformConfigSchema } from './config';

// --------------- Credential Schema ---------------

export interface CredentialField {
  description?: string;
  key: string;
  label: string;
  placeholder?: string;
  required: boolean;
  type: 'string' | 'secret';
}

// --------------- Platform Metadata ---------------

/**
 * Metadata describing a platform entry's capabilities and configuration requirements.
 *
 * Used by the server-side registry and the frontend bot configuration UI.
 * `platform` and `connectionMode` are defined on `BotPlatformEntry` and should not
 * be duplicated here.
 */
export interface BotPlatformMetadata {
  /** Credential fields required for this entry, drives the frontend config form */
  credentials: CredentialField[];
  /** Platform display name, e.g. "飞书", "Discord" */
  displayName: string;
  /**
   * JSON Schema describing user-configurable settings.
   *
   * Defines the structure, types, defaults, and constraints for
   * the `settings` jsonb column in the database.
   *
   * The frontend renders a settings form from this schema.
   * The runtime merges user overrides with schema defaults.
   */
  settingsSchema?: PlatformConfigSchema;
  /** Whether the platform supports direct messages */
  supportsDirectMessages: boolean;
  /** Whether the platform supports editing sent messages */
  supportsEditMessage: boolean;
  /** Whether the platform supports emoji reactions */
  supportsReaction: boolean;
  /** Whether the platform supports renaming threads */
  supportsThreadRename: boolean;
  /** Whether the platform supports typing indicators */
  supportsTyping: boolean;
}
