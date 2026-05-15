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

| Path | Description |
|------|-------------|
| `/:platform/:id/isValid` | Returns `{ valid: boolean }`. Returns `{ valid: false }` for unknown platforms (no error). |
| `/:platform/:id/banner.png` | Renders and returns a PNG. |
| `/:platform/:id/banner.jpg` | Renders and returns a JPEG. |

- Platform matching is case-insensitive (normalized to uppercase before lookup).
- Unknown platforms → 404 on image routes, `{ valid: false }` on isValid.
- Cache-Control: `public, max-age=60, stale-while-revalidate=300`.
- Cache key includes platform, id, output type, and sorted query parameters.

## Known differences from Java

| Aspect | Java | TypeScript |
|--------|------|------------|
| Spigot author | Separate author API call using `author.id` | Reads `author.username` directly from the resource response |
| Timeout handling | Apache HttpClient defaults | `AbortController` with configurable `timeoutMs` (default 5 s) |
| Schema validation | Manual field-by-field deserialization | Zod schema with `.safeParse()` — invalid payloads return `null` |

## Remaining marketplaces

The following platforms are not yet implemented and return 404:

- CurseForge
- Hangar
- BuiltByBit
- Polymart
- Ore
