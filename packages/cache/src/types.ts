/** Options used when constructing a {@link MemoryCache}. */
export interface CacheOptions {
  /** Default TTL for entries in milliseconds. */
  ttlMs: number;
  /** Maximum number of entries before LRU eviction. */
  maxEntries?: number;
  /** Rough maximum total byte estimate before oldest entries are evicted. */
  maxBytes?: number;
}

/** Per-call options for {@link IMemoryCache.getOrSet}. */
export interface GetOrSetOptions<T = unknown> {
  /** Reject a cached value when caller-specific freshness checks fail. */
  isFresh?: (value: T) => boolean;
  /** Skip storing a resolved value when caller-specific freshness checks fail. */
  cacheResult?: (value: T) => boolean;
  /** Override the cache-wide TTL for this entry, optionally after resolving its value. */
  ttlMs?: number | ((value: T) => number);
  /**
   * Byte estimate for this entry (used for maxBytes tracking).
   * Accepts either a static number or a function called with the resolved
   * value so the actual buffer length can be recorded after rendering.
   * Defaults to 0.
   */
  byteEstimate?: number | ((value: T) => number);
  /**
   * If true, cache null results. Defaults to false so that "not found"
   * responses are never stored and retried on the next call.
   */
  cacheNull?: boolean;
}

/** Snapshot of cache operation counters returned by {@link IMemoryCache.stats}. */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  /** Number of getOrSet calls that reused an inflight Promise (request coalescing). */
  coalesced: number;
}

/** Minimal interface that CacheNamespace delegates to. */
export interface IMemoryCache {
  get<T>(key: string): T | undefined;
  /** Returns the configured default TTL used for entries without an override. */
  getDefaultTtlMs?(): number;
  /** Returns the unexpired entry's remaining lifetime, or undefined if absent/expired. */
  getRemainingTtlMs(key: string): number | undefined;
  /** Returns a payload-free token for the active entry and its remaining lifetime. */
  getEntryFreshness(key: string): { token: symbol; remainingTtlMs: number } | undefined;
  set(key: string, value: unknown, ttlMs?: number, byteEstimate?: number): void;
  delete(key: string): boolean;
  clearPrefix(prefix: string): void;
  getOrSet<T>(key: string, fn: () => Promise<T>, opts?: GetOrSetOptions<T>): Promise<T>;
  getOrSetWithFreshness<T>(
    key: string,
    fn: () => Promise<T>,
    opts?: GetOrSetOptions<T>
  ): Promise<{ value: T; token: symbol | undefined }>;
}
