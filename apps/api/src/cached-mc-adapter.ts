import type { MemoryCache } from "@mcbanners/cache";
import type { MinecraftServerStatus, MinecraftStatusAdapter } from "@mcbanners/minecraft-status";

/**
 * Wraps any {@link MinecraftStatusAdapter} with an in-memory TTL cache.
 *
 * - Successful status responses are cached for the TTL configured on the
 *   provided {@link MemoryCache} instance (default 30 seconds).
 * - Null (server not found) results are NOT cached so the next request retries.
 * - Concurrent requests for the same host:port are coalesced into one underlying
 *   ping via {@link MemoryCache.getOrSet}'s request-coalescing behaviour.
 */
export class CachedMinecraftStatusAdapter implements MinecraftStatusAdapter {
  private readonly inner: MinecraftStatusAdapter;
  private readonly cache: MemoryCache;

  constructor(inner: MinecraftStatusAdapter, cache: MemoryCache) {
    this.inner = inner;
    this.cache = cache;
  }

  getStatus(host: string, port: number): Promise<MinecraftServerStatus | null> {
    return this.getStatusWithFreshness(host, port).then(({ value }) => value);
  }

  getStatusWithFreshness(
    host: string,
    port: number
  ): Promise<{ value: MinecraftServerStatus | null; token: symbol | undefined }> {
    const normalizedHost = host.toLowerCase();
    const key = `mc:status:${normalizedHost}:${String(port)}`;
    return this.cache.getOrSetWithFreshness<MinecraftServerStatus | null>(
      key,
      () => this.inner.getStatus(normalizedHost, port),
      { cacheNull: false }
    );
  }

  getStatusCacheFreshness(host: string, port: number) {
    return this.cache.getEntryFreshness(`mc:status:${host.toLowerCase()}:${String(port)}`);
  }
}
