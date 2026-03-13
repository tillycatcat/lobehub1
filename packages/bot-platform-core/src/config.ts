// --------------- Platform Config JSON Schema ---------------

/**
 * Lightweight JSON Schema subset for describing platform configuration.
 *
 * Each platform entry declares a `configSchema` in its metadata.
 * The schema drives:
 * - Frontend: auto-generated configuration form
 * - Runtime: default value resolution (user overrides ← schema defaults)
 * - Validation: ajv or similar can validate user input against the schema
 *
 * We intentionally define a minimal subset rather than importing the full
 * JSON Schema spec. This keeps the core package dependency-free while
 * covering all practical platform configuration needs.
 */

export interface PlatformConfigSchemaProperty {
  /** Default value for this property */
  default?: unknown;
  /** Human-readable description */
  description?: string;
  /** Valid values for string enums */
  enum?: string[];
  /** Labels for enum values (parallel array, used by UI) */
  enumLabels?: string[];
  /** Array item schema (when type = 'array') */
  items?: PlatformConfigSchemaProperty;
  /** Maximum value (when type = 'number' | 'integer') */
  maximum?: number;
  /** Minimum value (when type = 'number' | 'integer') */
  minimum?: number;
  /** Nested properties (when type = 'object') */
  properties?: Record<string, PlatformConfigSchemaProperty>;
  /** Human-readable title for UI labels */
  title?: string;
  /** Value type */
  type: 'array' | 'boolean' | 'integer' | 'number' | 'object' | 'string';
}

/**
 * JSON Schema object describing a platform's configurable options.
 *
 * Always a top-level `type: 'object'` with named properties.
 * Each property can be a primitive, enum, nested object, or array.
 *
 * Example (Discord):
 * ```ts
 * const configSchema: PlatformConfigSchema = {
 *   type: 'object',
 *   properties: {
 *     dm: {
 *       type: 'object',
 *       title: 'Direct Messages',
 *       properties: {
 *         enabled: { type: 'boolean', title: 'Enable DMs', default: false },
 *         policy: {
 *           type: 'string',
 *           title: 'DM Policy',
 *           enum: ['open', 'allowlist', 'disabled'],
 *           default: 'disabled',
 *         },
 *       },
 *     },
 *     charLimit: { type: 'number', title: 'Character Limit', default: 2000, minimum: 100 },
 *   },
 * };
 * ```
 */
export interface PlatformConfigSchema {
  properties: Record<string, PlatformConfigSchemaProperty>;
  type: 'object';
}
