# 014 – In-Memory Cache and Request Coalescing

## Status

Implemented in Milestone 8.

## Background

The first end-to-end HTTP render route (Milestone 6) proved that the rendering pipeline
works correctly. Every request rendered a fresh banner and performed a fresh Minecraft
status ping — acceptable for correctness but not for production workloads.

Redis (or any distributed cache) is intentionally deferred. The API runs as a single
process for now, and an in-memory cache eliminates redundant pings and re-renders without
introducing an external dependency, network hop, or serialisation overhead.

## Design

### `packages/cache` – MemoryCache

`MemoryCache` is a generic, dependency-free in-memory TTL cache with:

| Feature            | Detail                                                                        |
| ------------------ | ----------------------------------------------------------------------------- |
| TTL                | Per-entry or cache-wide default (milliseconds)                                |
| LRU eviction       | `Map` insertion order; `get` promotes to MRU via delete + reinsert            |
| Max entries        | Oldest entry evicted when `maxEntries` is exceeded                            |
| Max bytes          | Oldest entry evicted when `maxBytes` byte-estimate is exceeded                |
| Request coalescing | `getOrSet` stores an inflight `Promise`; concurrent callers share it          |
| Null not cached    | `getOrSet` default behaviour; pass `{ cacheNull: true }` to override          |
| Namespaces         | `cache.namespace("prefix")` isolates key-space; `clear()` scoped to namespace |
| Stats              | `hits`, `misses`, `sets`, `deletes`, `evictions`, `coalesced`                 |

### Request Coalescing

When multiple concurrent requests arrive for the same resource (e.g. 10 requests for
the same server banner arriving within the same 60 ms window), only one underlying
`getOrSet` factory call is made. All other callers receive the same `Promise` and are
counted in `stats().coalesced`.

If the factory call fails (throws), the inflight entry is removed so the next caller
retries. Failures are never cached.

### Cache Keys

| Resource         | Key pattern                                                      |
| ---------------- | ---------------------------------------------------------------- |
| Minecraft status | `mc:status:<host>:<port>`                                        |
| Rendered banner  | `banner:server:<host>:<port>:<outputType>:<sorted-query-string>` |

Query params in the banner cache key are sorted alphabetically so
`?a=1&b=2` and `?b=2&a=1` produce the same key.

### TTL / Cache-Control header choices

| Route                             | In-memory TTL   | `Cache-Control`                                   |
| --------------------------------- | --------------- | ------------------------------------------------- |
| `GET /mc/server`                  | 30 s            | `public, max-age=30, stale-while-revalidate=60`   |
| `GET /mc/icon`                    | (reuses status) | `public, max-age=300, stale-while-revalidate=600` |
| `GET /banner/server/…/banner.png` | 60 s            | `public, max-age=60, stale-while-revalidate=300`  |
| `GET /banner/server/…/banner.jpg` | 60 s            | `public, max-age=60, stale-while-revalidate=300`  |

The `stale-while-revalidate` window is double the max-age to allow CDN/proxy edge nodes
to serve a stale copy while a background refresh occurs.

### Why Redis is deferred

- Single-process deployment: an in-memory cache is sufficient and zero-overhead.
- Redis introduces a network hop, serialisation, and an operational dependency.
- The `MemoryCache`/`MinecraftStatusAdapter` boundaries are designed to be swappable;
  a `RedisCachedMinecraftStatusAdapter` could be added later without touching route code.

## Architecture

```
apps/api
  src/
    app.ts                    ← accepts optional AppCaches; wraps adapter when present
    cached-mc-adapter.ts      ← CachedMinecraftStatusAdapter (wraps any adapter)
    index.ts                  ← wires production caches; NODE_ENV guard for dev/prod adapter
    routes/
      mc-server.ts            ← Cache-Control headers on /mc/server and /mc/icon
      server-banner.ts        ← accepts optional bannerCache; Cache-Control on all images

packages/cache
  src/
    types.ts                  ← CacheOptions, GetOrSetOptions, CacheStats, IMemoryCache
    cache.ts                  ← MemoryCache (LRU + TTL + coalescing)
    namespace.ts              ← CacheNamespace (prefix isolation)
    index.ts                  ← public API
```

## Production cache sizing

| Cache         | maxEntries | maxBytes | Rationale                                |
| ------------- | ---------- | -------- | ---------------------------------------- |
| `mcStatus`    | 500        | —        | ~500 unique servers per process lifetime |
| `bannerImage` | 200        | 50 MB    | banner PNGs ~50–200 KB each              |

## Testing strategy

- All route tests use `createApp(adapter)` without caches — behaviour is unchanged.
- `packages/cache/test/cache.test.ts` tests the cache in isolation:
  - hit / miss / TTL expiry / LRU eviction / byte eviction
  - getOrSet success / failure / null / cacheNull override
  - request coalescing (fn called once; coalesced counter)
  - namespace isolation and namespace.clear()
  - stats correctness

## Known limitations

- `MemoryCache` is not thread-safe (Node/Bun is single-threaded; not an issue).
- `byteEstimate` is the caller's responsibility; there is no automatic measurement.
- The icon route (`/mc/icon`) reuses the MC status cache but does not have its own
  separate cache entry — the longer `Cache-Control` header is advisory to downstream
  proxies only.
- Redis / distributed caching is not implemented in this milestone.
