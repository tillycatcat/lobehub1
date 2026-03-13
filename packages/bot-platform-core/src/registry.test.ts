import { describe, expect, it } from 'vitest';

import { buildRuntimeKey, entryKey, parseRuntimeKey } from './registry';

describe('entryKey', () => {
  it('should build a key from platform and connectionMode', () => {
    expect(entryKey('discord', 'gateway')).toBe('discord:gateway');
    expect(entryKey('telegram', 'webhook')).toBe('telegram:webhook');
    expect(entryKey('lark', 'websocket')).toBe('lark:websocket');
  });
});

describe('buildRuntimeKey', () => {
  it('should build a runtime key from entry and applicationId', () => {
    const entry = { connectionMode: 'webhook', platform: 'telegram' } as any;
    expect(buildRuntimeKey(entry, 'bot-123')).toBe('telegram:webhook:bot-123');
  });
});

describe('parseRuntimeKey', () => {
  it('should parse a runtime key into components', () => {
    expect(parseRuntimeKey('discord:gateway:app-456')).toEqual({
      applicationId: 'app-456',
      connectionMode: 'gateway',
      platform: 'discord',
    });
  });

  it('should roundtrip with buildRuntimeKey', () => {
    const entry = { connectionMode: 'websocket', platform: 'lark' } as any;
    const key = buildRuntimeKey(entry, 'my-app');
    const parsed = parseRuntimeKey(key);
    expect(parsed).toEqual({
      applicationId: 'my-app',
      connectionMode: 'websocket',
      platform: 'lark',
    });
  });
});
