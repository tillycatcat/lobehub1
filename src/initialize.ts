import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import { enableMapSet } from 'immer';
// @ts-expect-error - prismjs is aliased to mocks/prismjs.ts in Vite config
import Prism from 'prismjs';

import { isChunkLoadError, notifyChunkError } from '@/utils/chunkError';

// @lexical/code references bare `Prism` global. The prismjs mock is aliased via
// Vite config but Rolldown may tree-shake side-effect-only imports. Explicitly
// set the global so the mock's stub is available before lexical code runs.
(globalThis as any).Prism = Prism;

enableMapSet();

// Dayjs plugins - extend once at app init to avoid duplicate extensions in components
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

// Global fallback: catch async chunk-load failures that escape Error Boundaries
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    if (isChunkLoadError((event as any).payload)) {
      event.preventDefault();
      notifyChunkError();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      notifyChunkError();
    }
  });
}
