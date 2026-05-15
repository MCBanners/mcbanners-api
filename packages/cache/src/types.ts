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
export interface GetOrSetOptions {
  /** Override the cache-wide TTL for this specific entry. */
  ttlMs?: number;
  /** Byte estimate for this entry (used for maxBytes tracking). Defaults to 0. */
  byteEstimate?: number;
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown, ttlMs?: number, byteEstimate?: number): void;
  delete(key: string): boolean;
  clearPrefix(prefix: string): void;
  getOrSet<T>(key: string, fn: () => Promise<T>, opts?: GetOrSetOptions): Promise<T>;
}
