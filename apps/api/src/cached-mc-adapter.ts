import { MemoryCache } from "@mcbanners/cache";
import type { MinecraftStatusAdapter, MinecraftServerStatus } from "@mcbanners/minecraft-status";

/** Default TTL for Minecraft server status cache entries (30 seconds). */
const STATUS_TTL_MS = 30_000;

/**
 * Wraps any {@link MinecraftStatusAdapter} with an in-memory TTL cache.
 *
 * - Successful status responses are cached for {@link STATUS_TTL_MS}.
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
    const normalizedHost = host.toLowerCase();
    const key = `mc:status:${normalizedHost}:${String(port)}`;
    return this.cache.getOrSet<MinecraftServerStatus | null>(
      key,
      () => this.inner.getStatus(normalizedHost, port),
      { ttlMs: STATUS_TTL_MS, cacheNull: false }
    );
  }
}
