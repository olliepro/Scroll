import type { ArxivEntry, Channel, FeedCacheEntry } from "../types";

export const FEED_CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Builds a stable cache key for a channel's fetch-defining fields.
 *
 * @param channel - Channel configuration used for the arXiv query.
 * @returns A serialized cache key that changes when the query inputs change.
 *
 * @example
 * const cacheKey = buildFeedCacheKey(channel);
 */
export function buildFeedCacheKey(channel: Channel): string {
  return JSON.stringify({
    id: channel.id,
    keywords: channel.keywords.trim(),
    categories: [...channel.categories].sort(),
    author: channel.author?.trim() ?? "",
    maxResults: channel.maxResults ?? 40,
  });
}

/**
 * Wraps fetched entries with a load timestamp for cache freshness checks.
 *
 * @param entries - Papers returned from arXiv for a channel.
 * @returns A persisted cache entry containing the load time and papers.
 *
 * @example
 * const cacheEntry = createFeedCacheEntry(entries);
 */
export function createFeedCacheEntry(entries: ArxivEntry[]): FeedCacheEntry {
  return {
    loadedAt: new Date().toISOString(),
    entries,
  };
}

/**
 * Checks whether a cached feed is still usable within the freshness window.
 *
 * @param entry - Persisted feed cache entry for a channel.
 * @param nowMs - Current timestamp override for deterministic checks.
 * @returns Whether the cache entry is still fresh enough to reuse.
 *
 * @example
 * const fresh = isFeedCacheFresh(entry);
 */
export function isFeedCacheFresh(
  entry: FeedCacheEntry | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!entry) return false;
  const loadedAtMs = Date.parse(entry.loadedAt);
  return !Number.isNaN(loadedAtMs) && nowMs - loadedAtMs < FEED_CACHE_TTL_MS;
}
