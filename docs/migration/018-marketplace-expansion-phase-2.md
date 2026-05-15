# 018 – Marketplace Expansion Phase 2: BuiltByBit and Polymart

**Milestone:** 12

## Overview

Completes live resource banner coverage by adding **BuiltByBit** and **Polymart** resource clients
behind the existing `ResourceClient` interface. Both platforms integrate with the unchanged
`/banner/resource/:platform/…` route without altering any shared infrastructure.

## BuiltByBit

### API

| Detail            | Value                                           |
| ----------------- | ----------------------------------------------- |
| Base URL          | `https://api.builtbybit.com/v1/`                |
| Auth              | `Authorization: Private {key}` on every request |
| Resource endpoint | `GET resources/{id}`                            |
| Author endpoint   | `GET members/{id}`                              |

### Key behavior

- **API key is required.** Set `BUILTBYBIT_API_KEY` in the environment. If not set, all requests
  return `null` (no key header → 401 from the API, handled as not-found).
- **Logo is always null.** The Java `BuiltByBitResourceService` passes an empty string as the icon
  and never fetches an image. This is preserved exactly.
- **Premium detection:** `price !== 0`. Premium resources expose `purchase_count` as the download
  figure and include a formatted price string.
- **`lastUpdated` is always null** (Java parity — the API does not expose a reliable update date).
- **Author** comes from `GET members/{author_id}` using the numeric `author_id` from the resource
  response. A 404 on the member call propagates as a `null` resource banner result.

### Auth header injection

`makeAuthFetchFn(key, baseFetch)` wraps the caller's `FetchFn` to inject the
`Authorization: Private {key}` header on every outgoing request. Both `Headers` instance and plain
object `init.headers` formats are handled.

### Known compatibility differences

- The Java client accepted the API key as a constructor argument passed directly. The TypeScript
  client reads it from `BuiltByBitClientOptions.apiKey`; the route wires this from
  `process.env["BUILTBYBIT_API_KEY"]`.
- Java parity: no logo image is fetched or displayed.

## Polymart

### API

| Detail            | Value                                   |
| ----------------- | --------------------------------------- |
| Base URL          | `https://api.polymart.org/v1/`          |
| Auth              | None                                    |
| Resource endpoint | `GET getResourceInfo/?resource_id={id}` |

### Key behavior

- **No authentication required.**
- **Author name comes directly from the resource response** (`response.resource.owner.name`).
  There is no separate author API call needed for resource banners. The Java
  `PolymartAuthorService.handle(authorId, resourceId)` team/user distinction is only relevant for
  author banner endpoints, which are not yet implemented.
- **Logo** is `resource.thumbnailURL` when present; `null` when absent or on logo fetch failure.
  Logo fetch failure falls back gracefully (does not fail the whole banner).
- **Rating:** `{ count: reviews.count, average: reviews.stars }` — matches Java's
  `new RatingInformation(reviewCount, (double) resource.stars())`.
- **Premium:** `price !== 0.0`.
- **`lastUpdated` is always null** (Java parity).

### Known compatibility differences

- Java `PolymartAuthorService` has special handling for team-owned resources when building author
  banners (not resource banners). This is not yet relevant and is documented for when author banner
  endpoints are implemented.
- Currency codes are normalized to uppercase (`USD`, `EUR`, etc.) to match Java behavior.

## Route support

Both platforms are registered in `parsePlatform()`:

| Route platform segment | Client                     |
| ---------------------- | -------------------------- |
| `builtbybit`           | `BuiltByBitResourceClient` |
| `polymart`             | `PolymartResourceClient`   |

Platform matching is case-insensitive. All existing route behavior (isValid, banner.png, banner.jpg,
cache headers, 404 propagation) applies unchanged.

## Cache key strategy

Cache keys follow the same pattern as all other platforms:

```
resource:{platform}:{id}:{outputFormat}:{sortedQueryParams}
```

- `platform` is lowercased.
- `id` is lowercased (numeric IDs are ASCII, slug IDs are lowercased for safety).
- `outputFormat` is lowercased (`png` or `jpg`).
- Query params are sorted and lowercased for stable keys.

## Manual test commands

```sh
# BuiltByBit — requires BUILTBYBIT_API_KEY env var
BUILTBYBIT_API_KEY=your_key bun run scripts/render-resource-url.ts builtbybit 12345 png

# Polymart — no auth required
bun run scripts/render-resource-url.ts polymart 123 png
bun run scripts/render-resource-url.ts polymart 123 jpg
```

These scripts hit live APIs and are not part of the automated test suite.

## Remaining gaps

- **Author banner endpoints** — BuiltByBit member banners and Polymart team/user author banners are
  not yet implemented. The Polymart team distinction (`owner.type === "team"`) is not needed until
  then.
- **BuiltByBit review details** — The API exposes `review_count` and `review_average`, both of
  which are normalized. No additional Java parity issues known.
- **Polymart logo caching** — Logo fetch results are not independently cached; they are part of the
  full rendered banner cache. A dedicated logo cache can be added when logo fetch latency becomes
  noticeable.
