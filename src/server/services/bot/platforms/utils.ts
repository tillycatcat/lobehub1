import type { UsageStats } from './types';

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}m`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) return `${minutes}m${seconds}s`;
  return `${seconds}s`;
}

/**
 * Format usage stats into a human-readable line.
 * e.g. "1.2k tokens · $0.0312 · 3s | llm×5 | tools×4"
 */
export function formatUsageStats(stats: UsageStats): string {
  const { totalTokens, totalCost, elapsedMs, llmCalls, toolCalls } = stats;
  const time = elapsedMs && elapsedMs > 0 ? ` · ${formatDuration(elapsedMs)}` : '';
  const calls =
    (llmCalls && llmCalls > 1) || (toolCalls && toolCalls > 0)
      ? ` | llm×${llmCalls ?? 0} | tools×${toolCalls ?? 0}`
      : '';
  return `${formatTokens(totalTokens)} tokens · $${totalCost.toFixed(4)}${time}${calls}`;
}
