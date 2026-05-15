# Resource Compatibility Matrix

_Milestone 13 — full resource route compatibility review_

This document captures the compatibility behaviour across all seven supported resource
banner platforms, comparing the TypeScript implementation against the original Java
`ResourceController` / `ResourceService` / `AuthorService` and their per-backend
service classes.

---

## Platform × Feature Matrix

| Feature                          | SPIGOT                                                 | MODRINTH                                | CURSEFORGE                           | HANGAR                                    | ORE                                     | BUILTBYBIT                                            | POLYMART                                         |
| -------------------------------- | ------------------------------------------------------ | --------------------------------------- | ------------------------------------ | ----------------------------------------- | --------------------------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| **ID format**                    | numeric string (`12345`)                               | slug or project ID                      | numeric string                       | `author/slug`                             | plugin-id slug                          | numeric string                                        | numeric string                                   |
| **Resource endpoint**            | SpigotMC Simple API `/getResource&id={id}`             | Modrinth v2 `/project/{id}`             | cfwidget.com `/{id}`                 | Hangar `/api/v1/projects/{author}/{slug}` | Ore v2 `/projects/{id}` (auth required) | BBB v1 `/resources/{id}` (auth required)              | Polymart v1 `/getResourceInfo/?resource_id={id}` |
| **Author source**                | `resource.author.username` (inline) ¹                  | First member of `/project/{id}/members` | `members[]` where `title == "Owner"` | `namespace.owner` from project            | `namespace.owner` from project          | Separate `/members/{author_id}` call                  | `resource.owner.name` (inline) ²                 |
| **Logo strategy**                | `icon_link` stripped of `?query`; fetched as base64    | `icon_url`; fetched as base64           | `thumbnail`; fetched as base64       | `avatarUrl`; fetched as base64            | `icon_url`; fetched as base64           | **Always null** ³                                     | `thumbnailURL`; fetched as base64                |
| **lastUpdated**                  | `null` ⁴                                               | `updated` (ISO 8601)                    | `download.uploaded_at`               | `lastUpdated` (ISO 8601)                  | **null** ⁵                              | **null** ⁴                                            | **null** ⁴                                       |
| **Review text branch**           | `{count} reviews`                                      | _(Updated date)_                        | _(Updated date)_                     | `{count} stars`                           | `{count} reviews`                       | `{count} reviews`                                     | `{count} reviews`                                |
| **Star sprites rendered**        | ✅                                                     | ❌ (NO_STARS_BACKENDS)                  | ❌ (NO_STARS_BACKENDS)               | ❌ (NO_STARS_BACKENDS)                    | ✅                                      | ✅                                                    | ✅                                               |
| **Rating count source**          | `stats.reviews.unique`                                 | `0` (Modrinth has no review system)     | `0` (CurseForge has no star rating)  | `stats.stars`                             | `stats.stars`                           | `review_count`                                        | `reviews.count`                                  |
| **Rating average source**        | `parseFloat(stats.rating)`                             | `null`                                  | `0` (always)                         | `0` (always)                              | `null`                                  | `review_average`                                      | `reviews.stars`                                  |
| **Download count source**        | `stats.downloads` (free) or `purchase_count` (premium) | `downloads`                             | `downloads.total`                    | `stats.downloads`                         | `stats.downloads`                       | `download_count` (free) or `purchase_count` (premium) | `downloads` (free) or _(same)_ (premium)         |
| **Premium check**                | `price !== "0.00"`                                     | _(no premium)_                          | _(no premium)_                       | _(no premium)_                            | _(no premium)_                          | `price !== 0`                                         | `price !== 0.0`                                  |
| **Price info shown**             | ✅ (if premium)                                        | ❌                                      | ❌                                   | ❌                                        | ❌                                      | ✅ (if premium)                                       | ✅ (if premium)                                  |
| **Price currency**               | `currency.toUpperCase()`                               | —                                       | —                                    | —                                         | —                                       | `currency.toUpperCase()`                              | `currency.toUpperCase()`                         |
| **Hangar multi-segment ID**      | ❌                                                     | ❌                                      | ❌                                   | ✅ (`author/slug`)                        | ❌                                      | ❌                                                    | ❌                                               |
| **Auth required**                | ❌                                                     | ❌                                      | ❌                                   | ❌                                        | ✅ (Ore session token)                  | ✅ (BBB API key)                                      | ❌                                               |
| **Default logo fallback sprite** | `SPIGOT` sprite                                        | `MODRINTH` sprite                       | `CURSEFORGE` sprite                  | `HANGAR` sprite                           | `ORE` sprite                            | `BUILTBYBIT` sprite                                   | `POLYMART` sprite                                |

---

## Known Java Compatibility Differences

### Spigot

1. **Author source simplification.** Java's `SpigotResourceService` calls a separate
   `/author/{id}` endpoint to retrieve the author object. The TypeScript client reads
   `resource.author.username` directly from the resource response. External banner
   output is identical; the separate author endpoint is only needed for future
   _author banner_ endpoints.
2. `lastUpdated` is `null`. Java passes `null` in the `Resource` constructor even
   though `stats.updates` exists. The Java layout does not display a date for Spigot.

### Modrinth

3. Rating `count` is always `0` and `average` is always `null`. Modrinth has no
   numeric star rating system; Java `ModrinthResourceService` creates
   `new RatingInformation(0, null)`.

### CurseForge

4. **202 Processing response.** Java throws `FurtherProcessingRequiredException` when
   cfwidget returns HTTP 202 (project being indexed). The TypeScript client lets the
   Zod schema reject the body silently — `fetchJson` returns `null`. The route returns
   404 in both cases.
5. Rating is always `{ count: 0, average: 0 }`. Java: `new RatingInformation(0, 0.0)`.
6. Author lookup: Java iterates `members` for `title.equalsIgnoreCase("Owner")`.
   TypeScript does the same — no difference.

### Hangar

7. `rating.average` is always `0`, not `null`. Java: `new RatingInformation(stars, 0.0)`.
   Layout skips star sprite rendering for HANGAR regardless of this value.
8. The Hangar `lastUpdated` field is included but shown as "Updated" date text
   (UPDATED_DATE_BACKENDS includes HANGAR in the layout — confirmed Java parity).

### Ore

9. `lastUpdated` is always `null`. Java `OreResourceService` passes `null` even though
   the `last_updated` field is present in the API response. This is intentional.
10. `rating.average` is always `null` (single-arg `RatingInformation` constructor in Java).
11. Ore v2 API requires session authentication (`POST /api/v2/authenticate`). Sessions
    are cached per `OreResourceClient` instance (not globally).

### BuiltByBit

12. **Logo always null.** Java passes `""` as the icon argument; no image fetch is
    performed. TypeScript matches this with `logoBase64: null`.
13. `lastUpdated` is always `null`. Java passes `null`.
14. Requires a BuiltByBit API key (`BUILTBYBIT_API_KEY` env var). Without a key the
    API returns 401; the client returns `null`; the route returns 404.

### Polymart

15. **Author inline.** Java's `PolymartAuthorService.handle(authorId, resourceId)`
    fetches `/getUser?user_id={authorId}` for _author banner_ endpoints. For _resource
    banners_, the author name is taken from `resource.owner.name` in the resource
    response — no separate author API call. TypeScript matches this.
16. `lastUpdated` is always `null`. Java passes `null`.

### Unknown Platform (general)

17. Java Spring MVC returns HTTP 400 for an unknown `BannerType` enum value.
    TypeScript returns HTTP 404 for an unknown platform string (no enum is involved).
    This difference is acceptable and documented.

---

## Route Behaviour

### Endpoints

```
GET /banner/resource/:platform/:id/isValid
GET /banner/resource/:platform/:id/banner.png
GET /banner/resource/:platform/:id/banner.jpg
```

- Platform matching is case-insensitive (`spigot`, `SPIGOT`, `Spigot` all work).
- Output format matching is case-insensitive (`banner.PNG`, `banner.Png` all work).
- Hangar IDs use `author/slug` format — the wildcard route captures them correctly.
- `isValid` returns `{ valid: false }` (not 404) for missing/null resources.
- Banner endpoints return HTTP 404 body for missing resources.

### Cache Keys

```
banner:resource:{platform_lower}:{id_lower}:{output_lower}:{sorted_query_params}
```

- All segments are lower-cased for deduplication.
- Query params are sorted alphabetically before joining.
- Display overrides (`resource_name__display=…`) change the query key, producing a
  separate cache entry.

### Cache-Control Headers

| Route                         | Header                                           |
| ----------------------------- | ------------------------------------------------ |
| `/banner.png` / `/banner.jpg` | `public, max-age=60, stale-while-revalidate=300` |
| `/isValid`                    | `public, max-age=30, stale-while-revalidate=60`  |

---

## Manual Test Commands

```sh
# Spigot
bun run scripts/render-resource-url.ts spigot 12345 png

# Modrinth
bun run scripts/render-resource-url.ts modrinth sodium png

# CurseForge
bun run scripts/render-resource-url.ts curseforge 238222 png

# Hangar (author/slug format)
bun run scripts/render-resource-url.ts hangar HangarDev/my-plugin png

# Ore
bun run scripts/render-resource-url.ts ore nucleus png

# BuiltByBit (requires BUILTBYBIT_API_KEY env var)
BUILTBYBIT_API_KEY=your_key bun run scripts/render-resource-url.ts builtbybit 12345 png

# Polymart
bun run scripts/render-resource-url.ts polymart 5678 png

# Render all fixtures (no network)
bun run scripts/render-all-resource-fixtures.ts
```

---

## isValid Behaviour by Platform

| Platform   | true                                  | false                           |
| ---------- | ------------------------------------- | ------------------------------- |
| SPIGOT     | Resource found                        | 404 or malformed response       |
| MODRINTH   | Project + at least one member found   | 404 or empty members            |
| CURSEFORGE | Project found with Owner member       | 404, 202, or no Owner member    |
| HANGAR     | Project found                         | 404 or malformed                |
| ORE        | Auth succeeded + project found        | Auth fail or 404                |
| BUILTBYBIT | Resource + member found (API key set) | 401 (no key), 404, or malformed |
| POLYMART   | Resource found                        | 404 or malformed                |
