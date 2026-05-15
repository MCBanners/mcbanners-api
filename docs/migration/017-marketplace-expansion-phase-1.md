# 017 — Marketplace Expansion: CurseForge, Hangar, and Ore

## Context

Milestone 11 extends the live resource banner system with three additional marketplace platforms:
CurseForge, Hangar (PaperMC), and Ore (SpongePowered). This brings the total supported platforms
to five: Spigot, Modrinth, CurseForge, Hangar, and Ore.

All three clients implement the same `ResourceClient` interface established in M10 and produce
`ResourceBannerData` compatible with the existing `ResourceBannerLayoutBuilder` pipeline.

## CurseForge

**Upstream API:** `https://api.cfwidget.com/{id}` (cfwidget.com public proxy — no API key required)

### Normalization

| Field       | Source                                                              |
| ----------- | ------------------------------------------------------------------- |
| name        | `title`                                                             |
| author      | First `members[]` entry where `title == "owner"` (case-insensitive) |
| logo        | `thumbnail` URL fetched as base64                                   |
| downloads   | `downloads.total`                                                   |
| lastUpdated | `download.uploaded_at`                                              |
| rating      | `{ count: 0, average: 0 }` — CurseForge has no rating system        |
| price       | `null` — all resources via cfwidget are free-tier                   |
| backend     | `"CURSEFORGE"`                                                      |

### Notable behavior

- cfwidget returns HTTP **202** while caching a new project. The 202 response body does not match
  the Zod schema, so `fetchJson` returns `null` automatically — no special 202 handling is needed.
- If no member with `title === "owner"` (case-insensitive) is found, the client returns `null`
  (treated as resource-not-found).
- Java parity: `new RatingInformation(0, 0.0)` — rating is intentionally zeroed.

### Layout behavior

- No star icons (layout checks `backend !== "CURSEFORGE"`)
- Shows "Updated" date text from `download.uploaded_at`

## Hangar

**Upstream API:** `https://hangar.papermc.io/api/v1/projects/{author}/{slug}`

Resource IDs use the `author/slug` composite format (e.g. `"papermc/eternal-light"`).

### Normalization

| Field       | Source                               |
| ----------- | ------------------------------------ |
| name        | `name`                               |
| author      | `namespace.owner`                    |
| logo        | `avatarUrl` fetched as base64        |
| downloads   | `stats.downloads`                    |
| lastUpdated | `lastUpdated` (ISO 8601)             |
| rating      | `{ count: stats.stars, average: 0 }` |
| price       | `null`                               |
| backend     | `"HANGAR"`                           |

### Notable behavior

- `rating.average = 0` (not null) — Java parity: `new RatingInformation(stars, 0.0)`.
  The layout excludes HANGAR from star icon rendering regardless, so the `average: 0` value is
  cosmetically irrelevant.
- Shows "{count} stars" text in the layout (the `HANGAR` branch in `buildResourceBannerNodes`).

### URL format in routes

Because Hangar IDs contain a literal `/` (`author/slug`), the resource banner route was updated
from `/:platform/:id/:bannerFile` to a unified wildcard handler `/:platform/*` that extracts the
ID and action from the remainder of the URL path:

- `/banner/resource/hangar/papermc/eternal-light/banner.png`
  → platform: `hangar`, id: `papermc/eternal-light`, action: `banner.png`
- `/banner/resource/spigot/12345/banner.png`
  → platform: `spigot`, id: `12345`, action: `banner.png`

The split is always based on the last `/`-delimited segment (the action), allowing any number of
segments before it.

## Ore

**Upstream API:** `https://ore.spongepowered.org/api/v2/`

Ore requires authenticated requests. Session tokens are obtained via:

```
POST /api/v2/authenticate → { session: string, expires: string (ISO 8601 with timezone) }
```

Subsequent requests use `Authorization: OreApi session={token}`.

### Session management

- Sessions are lazily authenticated on first request.
- Before each request, `OreResourceClient` checks `Date.now() < session.expiresAt`.
- If the session is expired or absent, it re-authenticates.
- The `expiresAt` is parsed from the ISO 8601 `expires` field using `Date.parse()`.

### Normalization

| Field       | Source                                  |
| ----------- | --------------------------------------- |
| name        | `name`                                  |
| author      | `namespace.owner`                       |
| logo        | `icon_url` fetched as base64            |
| downloads   | `stats.downloads`                       |
| lastUpdated | **`null`** — Java parity (explicitly)   |
| rating      | `{ count: stats.stars, average: null }` |
| price       | `null`                                  |
| backend     | `"ORE"`                                 |

### Notable behavior

- Plugin IDs are lowercased before the API request: `pluginId.toLowerCase()` — Java parity.
  The route handler already lowercases IDs before passing them to clients.
- `rating.average = null` — Java parity: `new RatingInformation(stars)` uses the single-arg
  constructor which leaves `averageRating` as null. Because `average` is null, the layout will
  not render star icons (controlled by `showStarIcons = average !== null && average > 0`).
- `lastUpdated = null` — Java `OreResourceService` explicitly sets null even though `last_updated`
  exists in the API response. This is preserved for compatibility.
- Shows "{count} reviews" text (standard behavior, as average is null → no star icons).

## Route changes

The `createResourceBannerRoute` handler was refactored to support multi-segment IDs:

**Before (M10):**

```
GET /:platform/:id/isValid
GET /:platform/:id/:bannerFile
```

**After (M11):**

```
GET /:platform/*
```

The wildcard remainder is split at the last `/` to extract `(id, action)` where `action` is
either `isValid` or `banner.(png|jpg)`. This is transparent for single-segment IDs (Spigot,
Modrinth, CurseForge, Ore) and correctly supports Hangar's two-segment `author/slug` format.

## Route parser hardening (M11 hardening)

The wildcard route logic was extracted into two pure functions in
`apps/api/src/routes/resource-route-parser.ts` for isolated unit testing:

### `extractRouteRemainder(pathname, rawPlatform)`

Finds the first occurrence of `/{rawPlatform}/` in the full URL pathname and returns everything
after it. This correctly handles Hono's behavior where `c.req.path` returns the full mount-prefixed
URL, not a sub-router-relative path.

```
/banner/resource/spigot/12345/banner.png → "12345/banner.png"
/banner/resource/hangar/author/slug/banner.png → "author/slug/banner.png"
```

Returns `null` when the platform marker is not found.

### `parseResourceRoutePath(remainder)`

Splits the remainder at the **last `/`** to extract `(id, action)`. This means:

- Single-segment id: `"12345/banner.png"` → `{ id: "12345", action: "banner.png" }`
- Two-segment Hangar id: `"author/slug/banner.png"` → `{ id: "author/slug", action: "banner.png" }`
- Extra slashes: `"too/many/slashes/banner.png"` → `{ id: "too/many/slashes", action: "banner.png" }`
  — the client receives the extra-slashed id and returns null → route 404
- Returns `null` for: empty string, no slash, empty id (leading slash), empty action (trailing slash)

### Cache key safety

Cache keys use `:` as the delimiter. IDs containing `/` (Hangar) cannot collide with any valid key
since platform names never contain `:` or `/`:

```
banner:resource:hangar:author/slug:png:...
banner:resource:spigot:12345:png:...
```

IDs are normalized to lowercase before use as cache keys and before being passed to clients.

### Edge case behavior

| URL pattern                                           | Outcome                                            |
| ----------------------------------------------------- | -------------------------------------------------- |
| `/banner/resource/spigot/a/b/banner.png`              | id=`a/b` passed to Spigot client → null → 404      |
| `/banner/resource/hangar/too/many/slashes/banner.png` | id=`too/many/slashes` → Hangar client → null → 404 |
| `/banner/resource/spigot/123` (no action)             | `parseResourceRoutePath` returns null → 404        |
| `/banner/resource/spigot/123/banner.webp`             | Unknown output type → 400                          |
| `/banner/resource/unknown/123/banner.png`             | Unknown platform → no client → 404                 |

### Ore session isolation

Each `OreResourceClient` instance owns its own `private session` field — there is no shared static
state between instances. Two separate clients will each authenticate independently. Within the same
instance, the session is reused until expiry.

## Apps wired

`apps/api/src/index.ts` adds live clients to `resourceClients`:

```ts
CURSEFORGE: new CurseForgeResourceClient(),
HANGAR: new HangarResourceClient(),
ORE: new OreResourceClient()
```

## Tests

All new client tests use injected `FetchFn` mocks — no live API calls are required.

| Test file                                                  | Coverage                                                                                                                                                                                           |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/external-clients/test/curseforge-client.test.ts` | nominal, owner-case, no-owner (null), 202 processing, icon-fail, 404, malformed JSON                                                                                                               |
| `packages/external-clients/test/hangar-client.test.ts`     | nominal, no-avatar, 404, malformed JSON, icon-fail, empty lastUpdated                                                                                                                              |
| `packages/external-clients/test/ore-client.test.ts`        | nominal, id-lowercase, session-reuse, session-isolation, auth-fail, auth-malformed, project-404, project-malformed, icon-fail, no-icon                                                             |
| `apps/api/test/resource-route-parser.test.ts`              | `parseResourceRoutePath` (all branches), `extractRouteRemainder` (all branches), combined pipeline                                                                                                 |
| `apps/api/test/resource-banner.test.ts`                    | CurseForge/Hangar/Ore route success, JPEG, isValid, case-insensitive, null-client 404, edge cases (slash id, too-many-slashes, missing action, unknown action, unknown platform), cache key safety |

## Manual testing

```sh
# CurseForge
bun run scripts/render-resource-url.ts curseforge 32274

# Hangar (author/slug format)
bun run scripts/render-resource-url.ts hangar "papermc/eternal-light"

# Ore
bun run scripts/render-resource-url.ts ore nucleus
```

## Known differences from Java

| Platform   | Java behavior                                  | This implementation                          |
| ---------- | ---------------------------------------------- | -------------------------------------------- |
| CurseForge | cfwidget 202 may need polling                  | Returns null (client treats it as not-found) |
| Hangar     | Uses hangar4j library (Java client)            | Direct HTTP to Hangar public API             |
| Ore        | Uses Ore v2 session auth with Java HTTP client | Same session auth, pure fetch-based          |
| Ore        | Session expiry via parsed timestamp            | `Date.parse()` on ISO 8601 — same semantics  |

## Remaining marketplace gaps

- **BuiltByBit** — not yet implemented (M12+)
- **Polymart** — not yet implemented (M12+)
- Saved banner recall — not yet implemented
- Discord bot — not yet implemented
