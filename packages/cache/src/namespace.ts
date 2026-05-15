import type { GetOrSetOptions, IMemoryCache } from "./types";

/**
 * A namespace provides prefix-isolated access to an underlying {@link IMemoryCache}.
 *
 * All keys are automatically prefixed with `<prefix>:`, so two namespaces with
 * different prefixes never collide. Stats are tracked at the parent cache level.
 *
 * Obtain via `cache.namespace("prefix")` rather than constructing directly.
 */
export class CacheNamespace {
  constructor(
    private readonly cache: IMemoryCache,
    private readonly prefix: string
  ) {}

  private key(k: string): string {
    return `${this.prefix}:${k}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  get<T>(key: string): T | undefined {
    return this.cache.get<T>(this.key(key));
  }

  set(key: string, value: unknown, ttlMs?: number, byteEstimate?: number): void {
    this.cache.set(this.key(key), value, ttlMs, byteEstimate);
  }

  delete(key: string): boolean {
    return this.cache.delete(this.key(key));
  }

  /** Removes all entries belonging to this namespace. */
  clear(): void {
    this.cache.clearPrefix(this.prefix + ":");
  }

  getOrSet<T>(key: string, fn: () => Promise<T>, opts?: GetOrSetOptions): Promise<T> {
    return this.cache.getOrSet<T>(this.key(key), fn, opts);
  }
}
