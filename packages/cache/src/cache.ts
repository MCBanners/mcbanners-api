import { CacheNamespace } from "./namespace";
import type { CacheOptions, CacheStats, GetOrSetOptions, IMemoryCache } from "./types";

interface CacheEntry {
  value: unknown;
  expiresAt: number;
  byteEstimate: number;
  token: symbol;
}

interface CachedValue<T> {
  value: T;
  token: symbol | undefined;
}

/**
 * In-memory TTL cache with LRU eviction and request coalescing.
 *
 * - Entries expire after `ttlMs` milliseconds (or a per-entry override).
 * - When `maxEntries` is reached, the least-recently-accessed entry is evicted.
 * - When `maxBytes` is reached, the oldest entry is evicted until under the limit.
 * - `getOrSet` deduplicates concurrent requests for the same key so the factory
 *   is only called once per inflight group (request coalescing).
 * - Null results are NOT cached by default; pass `{ cacheNull: true }` to override.
 */
export class MemoryCache implements IMemoryCache {
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;
  private readonly maxBytes: number;
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<CachedValue<unknown>>>();
  private totalBytes = 0;

  private _hits = 0;
  private _misses = 0;
  private _sets = 0;
  private _deletes = 0;
  private _evictions = 0;
  private _coalesced = 0;

  constructor(opts: CacheOptions) {
    this.defaultTtlMs = opts.ttlMs;
    this.maxEntries = opts.maxEntries ?? Infinity;
    this.maxBytes = opts.maxBytes ?? Infinity;
  }

  get<T>(key: string): T | undefined {
    return this.getWithToken<T>(key)?.value;
  }

  private getWithToken<T>(key: string): CachedValue<T> | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      this._misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.removeEntry(key, entry, true);
      this._misses++;
      return undefined;
    }
    // Refresh LRU order: delete + reinsert moves the key to the "most recent" end.
    this.entries.delete(key);
    this.entries.set(key, entry);
    this._hits++;
    return { value: entry.value as T, token: entry.token };
  }

  getRemainingTtlMs(key: string): number | undefined {
    return this.getEntryFreshness(key)?.remainingTtlMs;
  }

  /** Returns the active payload-free entry token and remaining TTL. */
  getEntryFreshness(key: string): { token: symbol; remainingTtlMs: number } | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    const remainingTtlMs = entry.expiresAt - Date.now();
    if (remainingTtlMs <= 0) {
      this.removeEntry(key, entry, true);
      return undefined;
    }
    return { token: entry.token, remainingTtlMs };
  }

  set(key: string, value: unknown, ttlMs?: number, byteEstimate?: number): void {
    const bytes = byteEstimate ?? 0;
    // Replace an existing entry without double-counting its bytes.
    const existing = this.entries.get(key);
    if (existing !== undefined) {
      this.totalBytes -= existing.byteEstimate;
      this.entries.delete(key);
    }
    const entry: CacheEntry = {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      byteEstimate: bytes,
      token: Symbol()
    };
    this.entries.set(key, entry);
    this.totalBytes += bytes;
    this._sets++;
    this.enforceLimits();
  }

  delete(key: string): boolean {
    const entry = this.entries.get(key);
    if (entry === undefined) return false;
    this.removeEntry(key, entry, false);
    this._deletes++;
    return true;
  }

  clear(): void {
    this.entries.clear();
    this.inflight.clear();
    this.totalBytes = 0;
  }

  /**
   * Deletes all entries whose keys start with the given prefix.
   * Used by {@link CacheNamespace.clear} to reset a namespace.
   */
  clearPrefix(prefix: string): void {
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) {
        const entry = this.entries.get(key);
        if (entry !== undefined) {
          this.removeEntry(key, entry, false);
          this._deletes++;
        }
      }
    }
  }

  /**
   * Returns the cached value for `key` if present and unexpired. Otherwise
   * calls `fn()` exactly once (even for concurrent callers — see below), stores
   * the result (unless null and `cacheNull` is false), and returns it.
   *
   * **Request coalescing**: if multiple callers invoke `getOrSet` for the same
   * key while a factory call is already inflight, they all receive the same
   * Promise and `fn` is only invoked once. Each coalesced call increments the
   * `coalesced` stat counter.
   *
   * Failures (thrown errors) are not cached and the inflight entry is removed
   * so subsequent calls will retry.
   */
  getOrSet<T>(key: string, fn: () => Promise<T>, opts?: GetOrSetOptions<T>): Promise<T> {
    return this.getOrSetWithFreshness(key, fn, opts).then(({ value }) => value);
  }

  getOrSetWithFreshness<T>(
    key: string,
    fn: () => Promise<T>,
    opts?: GetOrSetOptions<T>
  ): Promise<CachedValue<T>> {
    const cached = this.getWithToken<T>(key);
    if (cached !== undefined) {
      if (opts?.isFresh?.(cached.value) !== false) return Promise.resolve(cached);
      this.delete(key);
    }

    const existing = this.inflight.get(key);
    if (existing !== undefined) {
      this._coalesced++;
      return existing as Promise<CachedValue<T>>;
    }

    const promise: Promise<CachedValue<T>> = fn()
      .then((value: T) => {
        this.inflight.delete(key);
        let token: symbol | undefined;
        if ((value !== null || opts?.cacheNull === true) && opts?.cacheResult?.(value) !== false) {
          const raw = opts?.byteEstimate;
          const bytes = typeof raw === "function" ? raw(value) : (raw ?? 0);
          const rawTtl = opts?.ttlMs;
          const ttlMs = typeof rawTtl === "function" ? rawTtl(value) : rawTtl;
          this.set(key, value, ttlMs, bytes);
          token = this.entries.get(key)?.token;
        }
        return { value, token };
      })
      .catch((err: unknown) => {
        this.inflight.delete(key);
        throw err;
      });

    this.inflight.set(key, promise);
    return promise;
  }

  /** Returns a namespace that automatically prefixes all keys with `<prefix>:`. */
  namespace(prefix: string): CacheNamespace {
    return new CacheNamespace(this, prefix);
  }

  /** Returns a snapshot of the current operation counters. */
  stats(): CacheStats {
    return {
      hits: this._hits,
      misses: this._misses,
      sets: this._sets,
      deletes: this._deletes,
      evictions: this._evictions,
      coalesced: this._coalesced
    };
  }

  private removeEntry(key: string, entry: CacheEntry, isEviction: boolean): void {
    this.entries.delete(key);
    this.totalBytes -= entry.byteEstimate;
    if (isEviction) this._evictions++;
  }

  private enforceLimits(): void {
    while (this.entries.size > this.maxEntries || this.totalBytes > this.maxBytes) {
      // Map iteration order is insertion order; the first entry is the LRU.
      for (const [key, entry] of this.entries) {
        this.removeEntry(key, entry, true);
        break;
      }
    }
  }
}
