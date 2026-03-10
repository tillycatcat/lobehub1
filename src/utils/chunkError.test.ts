import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isChunkLoadError, notifyChunkError } from './chunkError';

vi.mock('@lobehub/ui', () => ({
  toast: {
    info: vi.fn(),
  },
}));

describe('isChunkLoadError', () => {
  describe('Chrome / Vite pattern', () => {
    it('should detect "Failed to fetch dynamically imported module" in message', () => {
      const error = new Error('Failed to fetch dynamically imported module: /chunk.js');
      expect(isChunkLoadError(error)).toBe(true);
    });

    it('should detect the pattern in a combined name+message string', () => {
      const error = { message: 'Failed to fetch dynamically imported module', name: 'TypeError' };
      expect(isChunkLoadError(error)).toBe(true);
    });
  });

  describe('Firefox pattern', () => {
    it('should detect "error loading dynamically imported module"', () => {
      const error = new Error('error loading dynamically imported module');
      expect(isChunkLoadError(error)).toBe(true);
    });
  });

  describe('Safari patterns', () => {
    it('should detect "Importing a module script failed"', () => {
      const error = new Error('Importing a module script failed');
      expect(isChunkLoadError(error)).toBe(true);
    });

    it('should detect "Failed to load module script"', () => {
      const error = new Error('Failed to load module script: strict MIME type checking...');
      expect(isChunkLoadError(error)).toBe(true);
    });
  });

  describe('Webpack patterns', () => {
    it('should detect "Loading chunk" in message', () => {
      const error = new Error('Loading chunk 3 failed.');
      expect(isChunkLoadError(error)).toBe(true);
    });

    it('should detect "Loading CSS chunk" in message', () => {
      const error = new Error('Loading CSS chunk 5 failed.');
      expect(isChunkLoadError(error)).toBe(true);
    });

    it('should detect "ChunkLoadError" in error name', () => {
      const error = { name: 'ChunkLoadError', message: 'Loading chunk 42 failed.' };
      expect(isChunkLoadError(error)).toBe(true);
    });

    it('should detect "ChunkLoadError" when it appears only in the name field', () => {
      const error = { name: 'ChunkLoadError', message: '' };
      expect(isChunkLoadError(error)).toBe(true);
    });
  });

  describe('non-chunk errors', () => {
    it('should return false for a generic Error', () => {
      const error = new Error('Something went wrong');
      expect(isChunkLoadError(error)).toBe(false);
    });

    it('should return false for a network error unrelated to chunks', () => {
      const error = new Error('Failed to fetch');
      expect(isChunkLoadError(error)).toBe(false);
    });

    it('should return false for a TypeError with unrelated message', () => {
      const error = new TypeError('Cannot read properties of undefined');
      expect(isChunkLoadError(error)).toBe(false);
    });

    it('should return false for a plain string error', () => {
      expect(isChunkLoadError('some string error')).toBe(false);
    });

    it('should return false for a number error value', () => {
      expect(isChunkLoadError(500)).toBe(false);
    });

    it('should return false for an object without chunk-related keys', () => {
      expect(isChunkLoadError({ code: 42, reason: 'timeout' })).toBe(false);
    });
  });

  describe('falsy / edge case values', () => {
    it('should return false for null', () => {
      expect(isChunkLoadError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isChunkLoadError(undefined)).toBe(false);
    });

    it('should return false for false', () => {
      expect(isChunkLoadError(false)).toBe(false);
    });

    it('should return false for 0', () => {
      expect(isChunkLoadError(0)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isChunkLoadError('')).toBe(false);
    });
  });

  describe('pattern matching in combined name+message', () => {
    it('should match when pattern spans name and message boundary', () => {
      // "ChunkLoadError" in name; the combined string is "ChunkLoadError Loading chunk 3 failed."
      const error = { name: 'ChunkLoadError', message: 'Loading chunk 3 failed.' };
      expect(isChunkLoadError(error)).toBe(true);
    });

    it('should detect pattern when name is empty and message has the pattern', () => {
      const error = { name: '', message: 'Loading chunk 7 failed.' };
      expect(isChunkLoadError(error)).toBe(true);
    });

    it('should detect pattern when message is empty string and name has the pattern', () => {
      const error = { name: 'ChunkLoadError', message: '' };
      expect(isChunkLoadError(error)).toBe(true);
    });
  });
});

describe('notifyChunkError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call toast.info with the update message', async () => {
    const { toast } = await import('@lobehub/ui');
    notifyChunkError();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith('Web app has been updated so it needs to be reloaded.');
  });
});
