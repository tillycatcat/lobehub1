import type { PlatformDefinition } from './types';

/**
 * Build a registry key for a platform entry.
 * Format: `platform:connectionMode`
 */
export function entryKey(platform: string, connectionMode: string): string {
  return `${platform}:${connectionMode}`;
}

/**
 * Build a runtime key for a registered bot instance.
 * Format: `platform:connectionMode:applicationId`
 */
export function buildRuntimeKey(entry: PlatformDefinition, applicationId: string): string {
  return `${entry.platform}:${entry.connectionMode}:${applicationId}`;
}

/**
 * Parse a runtime key back into its components.
 */
export function parseRuntimeKey(key: string): {
  applicationId: string;
  connectionMode: string;
  platform: string;
} {
  const [platform, connectionMode, applicationId] = key.split(':');
  return { applicationId, connectionMode, platform };
}
