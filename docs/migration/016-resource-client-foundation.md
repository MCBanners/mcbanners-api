# 016 — Resource Client Foundation: Spigot + Modrinth

## Context

Milestone 10 introduces the first external marketplace API clients and the `/banner/resource` route. The Java legacy API supported seven marketplaces; this milestone targets Spigot and Modrinth as the highest-priority, best-documented platforms.

## Package: `@mcbanners/external-clients`

### HTTP client strategy

`packages/external-clients/src/http-client.ts` provides two low-level helpers:

- **`fetchJson<T>(url, schema, options?, fetchFn?)`** — Fetches JSON, parses it with a Zod schema, and returns `T | null`. Returns `null` on 404, network errors, timeouts, and schema validation failures.
- **`fetchImageBase64(url, options?, fetchFn?)`** — Fetches a binary resource and returns its base64 encoding, or `null` on empty URL, network error, or non-OK response.

Both functions default to a 5 s timeout (via `AbortController`) and send `User-Agent: MCBanners`. An optional `fetchFn` parameter allows tests to inject mock implementations without patching globals.

### `ResourceClient` interface

A single method: `getResourceBannerData(id: string): Promise<ResourceBannerData | null>`. Callers never need to know which platform underlies the client.

## Spigot normalization

- API base: `https://api.spigotmc.org/simple/0.2/index.php?action=`
- Resource IDs are numeric strings.
- Icon URL has the query string stripped (`icon_link.split("?")[0]`) before fetching.
- `isPremium` is derived from `price !== "0.00"`.
- `rating.average` is always set (Spigot always returns a rating field); it defaults to `0` if the string parses as `NaN`.
- `rating.count` is parsed from `uniqueReviews` (not the raw `reviews` count).
- `authorName` is taken directly from the resource response's `author.username` field — no separate author API call is needed (simplification over the Java implementation).
- `lastUpdated` is always `null` — Spigot does not expose an update timestamp in this endpoint.

## Modrinth normalization

- API base: `https://api.modrinth.com/v2`
- Accepts both numeric IDs and slugs.
- Author name comes from the `/project/{id}/members` endpoint (first member's `username`). Returns `null` if the members array is empty or the endpoint fails.
- `rating` is always `{ count: 0, average: null }` — Modrinth has no rating system.
- `price` is always `null` — all Modrinth projects are free.
- `lastUpdated` is the `updated` ISO 8601 string from the project response.

## Route: `/banner/resource/:platform/:id/...`

Mounted at `/banner/resource` in `apps/api`. Accepts:

| Path                        | Description                                                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/:platform/:id/isValid`    | Returns `{ valid: boolean }` with `Cache-Control: public, max-age=30, stale-while-revalidate=60`. Returns `{ valid: false }` for unknown platforms (no error). |
| `/:platform/:id/banner.png` | Renders and returns a PNG with `Cache-Control: public, max-age=60, stale-while-revalidate=300`.                                                                |
| `/:platform/:id/banner.jpg` | Renders and returns a JPEG with the same cache headers.                                                                                                        |

### Platform and ID normalization

- **Platform**: normalized to uppercase before client lookup. Case-insensitive in the URL (`spigot`, `SPIGOT`, `Spigot` all resolve to the same client).
- **ID**: normalized to lowercase before passing to the client and before constructing the cache key. This ensures `Sodium`, `sodium`, and `SODIUM` all share the same cache entry and produce the same request to the upstream API (Modrinth slugs are case-insensitive; Spigot IDs are numeric).

### Cache key strategy

```
banner:resource:<platform_lower>:<id_lower>:<output_type_lower>:<sorted_query_params>
```

Query parameters are sorted lexicographically before joining, so `?z=1&a=2` and `?a=2&z=1` produce the same key. Custom render settings (e.g., `background__template=OCEAN_DUSK`) change the key, resulting in a distinct cache entry.

### Error behavior

| Condition                                | Banner route                    | isValid route          |
| ---------------------------------------- | ------------------------------- | ---------------------- |
| Unknown platform                         | 404 JSON                        | `{ valid: false }` 200 |
| Resource not found (client returns null) | 404 empty                       | `{ valid: false }` 200 |
| Unsupported file extension               | 400 JSON                        | n/a                    |
| Icon fetch failure                       | 200 (logo falls back to sprite) | `{ valid: true }`      |

404 and 400 responses do **not** include `Cache-Control` headers.

### Author null path

The Java `ResourceController` had separate resource and author fetches, returning 404 if either was null. Our `getResourceBannerData` bundles both — if the author cannot be resolved (e.g., Modrinth members endpoint fails or returns empty), the entire method returns `null`, which the route surfaces as 404. The external behavior is identical.

## Known differences from Java

| Aspect                    | Java                                           | TypeScript                                                      |
| ------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Spigot author             | Separate author API call using `author.id`     | Reads `author.username` directly from the resource response     |
| Modrinth members response | Handles both array and single-object responses | Zod schema accepts array only (the real API returns an array)   |
| Timeout handling          | Apache HttpClient defaults                     | `AbortController` with configurable `timeoutMs` (default 5 s)   |
| Schema validation         | Manual field-by-field deserialization          | Zod schema with `.safeParse()` — invalid payloads return `null` |
| Unknown platform          | Spring 400 (enum binding failure)              | 404 for banner routes, `{ valid: false }` 200 for isValid       |
| Icon content-type         | Only accepts `image/*` content types           | Accepts any non-empty content-type                              |

## Manual live testing

```bash
# Fetch and render a Spigot resource (live network required)
bun run scripts/render-resource-url.ts spigot 12345

# Fetch and render a Modrinth resource as JPEG
bun run scripts/render-resource-url.ts modrinth sodium jpg

# Custom output directory
bun run scripts/render-resource-url.ts spigot 12345 png ./tmp/test-out
```

Output is written to `./tmp/resource-url-out/` by default. The script does not affect automated tests.

## All platforms supported

All seven platforms are now fully implemented. See the compatibility matrix in
`docs/migration/019-resource-compatibility-matrix.md` for a full breakdown.
