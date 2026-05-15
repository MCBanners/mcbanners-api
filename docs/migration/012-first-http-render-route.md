# 012 — First HTTP Render Route

## Summary

Milestone 6 adds the first real end-to-end HTTP rendering flow for Minecraft server banners.
It wires together the render-node system from Milestone 4 and the layout pipeline from Milestone 5
into a live Hono route that accepts a host/port, looks up server status, and returns a PNG or JPG image.

All rendering is fixture-driven at this stage — no live Minecraft ping is performed.

---

## Architecture

```
GET /server/:host/:port/banner.png
         │
         ▼
  FixtureMinecraftStatusAdapter
  (Map<"host:port", McApiResponse>)
         │
         ▼
  normalizeMinecraftServerStatus()
  → MinecraftServerStatus
         │
         ▼
  mapStatusToServerBannerData()
  → ServerBannerData
         │
         ▼
  parseServerBannerSettings() + applyServerBannerDefaults()
  → ServerBannerSettings
         │
         ▼
  buildServerBannerNodes()
  → RenderNode[]
         │
         ▼
  createCanvasSurface() + renderNode() × N
         │
         ▼
  encodePng() / encodeJpg()
         │
         ▼
  Response (image/png or image/jpeg)
```

---

## New Packages

### `packages/minecraft-status`

Provides the normalized domain model for Minecraft server status:

- **`MinecraftServerStatus`** — normalized status including host, port, version, players, motd, iconDataUrl
- **`MinecraftServerPlayers`** — online/max player counts
- **`MinecraftServerMotd`** — raw, colorless, and formatted MOTD strings
- **`McApiResponse`** — raw JSON shape as returned by the legacy mc-api service
- **`normalizeMinecraftServerStatus()`** — maps a raw `McApiResponse` to `MinecraftServerStatus`
- **`MinecraftStatusAdapter`** — interface: `getStatus(host, port) → Promise<MinecraftServerStatus | null>`
- **`FixtureMinecraftStatusAdapter`** — Map-backed adapter for tests and local development
- **`createFixtureAdapter(record)`** — convenience factory from a plain object keyed by `"host:port"`
- **Built-in fixtures** — Hypixel, no-icon, long-MOTD, unicode MOTD variants

---

## New Routes

### `apps/api`

All routes are wired through `createApp(adapter)`, which accepts any `MinecraftStatusAdapter`.
This makes routes fully test-injectable without mocking globals.

#### `GET /health`

Returns `{ status: "ok" }`.

#### `GET /mc/server?host=&port=`

Returns normalized `MinecraftServerStatus` JSON for a known fixture, or 404 if not found.

Mirrors the legacy mc-api status endpoint shape for compatibility.

#### `GET /server/:host/:port/isValid`

Returns `{ valid: true, host, port }` for known servers, `{ valid: false }` for unknown ones.

#### `GET /server/:host/:port/banner.png` / `banner.jpg`

Full render pipeline. Accepts optional query parameters mapped to `ServerBannerParams`:

| Parameter | Default | Notes |
|-----------|---------|-------|
| `background` | `"dark"` | `dark`, `light`, `transparent` |
| `borderRadius` | `0` | px, `0`–`50` |
| `hideServerIcon` | `false` | |
| `hidePlayers` | `false` | |
| `hideVersion` | `false` | |
| `showMotd` | `true` | |
| `hideServerName` | `false` | |
| `nameFont` / `playersFont` / `versionFont` / `motdFont` | — | `"default"`, `"minecraft"`, `"opensans"` |
| `nameAlign` / `playersAlign` / `versionAlign` / `motdAlign` | — | `"left"`, `"center"`, `"right"` |

Returns `image/png` (300×100) or `image/jpeg` with the correct content-type header.

---

## Hono Dot-Param Limitation

Hono v4 does not parse `:param` after a literal dot within the same path segment.
For example, `/:host/:port/banner.:outputType` results in `outputType = undefined`.

**Workaround:** The route uses `/:host/:port/:bannerFile` and parses the extension manually:

```ts
const BANNER_FILENAME_RE = /^banner\.(png|jpg)$/i;
const match = BANNER_FILENAME_RE.exec(bannerFile);
```

Invalid filenames (e.g. `banner.gif`, `banner.webp`, `icon.png`) return 400 with an error message.

---

## Data Mapper

`packages/banner-renderer/src/layouts/server/server-banner-data-mapper.ts`

Maps `MinecraftServerStatus` to `ServerBannerData`:

- `name` ← `status.host` (no separate display name in mc-api response)
- `version` ← `status.version`
- `playerCount` ← `status.players.online`
- `maxPlayerCount` ← `status.players.max`
- `motd` ← `status.motd.colorless` (Minecraft color codes stripped)
- `iconBase64` ← `status.iconDataUrl` with `"data:image/png;base64,"` prefix stripped, or null

---

## TypeScript Project Reference Strategy

Packages with test files use a two-tsconfig pattern:

- `tsconfig.json` — `noEmit: true`, no `rootDir`, includes `src/**/*.ts` + `test/**/*.ts`. Used by ESLint's project service and IDEs.
- `tsconfig.build.json` — `composite: true`, `rootDir: "src"`, `outDir: "dist"`, includes `src/**/*.ts` only. Used by `tsc -b`.

Root `tsconfig.build.json` and all inter-package `references` arrays must point to `tsconfig.build.json` explicitly (e.g. `{ "path": "../minecraft-status/tsconfig.build.json" }`), not to the directory.

**Important:** TypeScript `extends` does NOT inherit `references`. Every tsconfig that uses project references must list them explicitly, even if it extends another config that also lists them.

---

## ESLint Configuration

`eslint.config.js` ignores `**/test/**/*.js` and `**/test/**/*.d.ts` to prevent stale build artifacts in test directories from being linted.

---

## Fixture Strategy

Fixtures in `packages/minecraft-status/src/fixtures.ts` cover:

| Key | Description |
|-----|-------------|
| `mc.hypixel.net:25565` | Large server with icon, high player count |
| `noicon.local:25565` | Server with no icon (empty icon field) |
| `longmotd.local:25565` | Server with a long two-line MOTD |
| `unicode.local:25565` | Server with Unicode/emoji MOTD |

`MC_STATUS_FIXTURES` is a `Record<string, McApiResponse>` passed to `createFixtureAdapter()`.

---

## Determinism

Rendering remains deterministic end-to-end:

- Fixtures are static — no randomness, no timestamps
- Fonts are bundled assets loaded by path
- `skia-canvas` produces stable pixel output for identical input
- Tests verify PNG magic bytes and approximate size, not pixel-exact hashes (canvas output is environment-dependent at the pixel level, but structurally stable)

---

## Remaining Gaps

### Before live Minecraft ping integration

- Implement `HttpMinecraftStatusAdapter` that calls the mc-api HTTP endpoint
- Replace `FixtureMinecraftStatusAdapter` in `apps/api/src/index.ts` with the HTTP adapter
- Add timeout and error handling

### Before marketplace layout migration

- Port ResourceLayout, PluginLayout, UserLayout from legacy banner-api
- Extend `createApp()` with resource/user/plugin route groups
- Add domain types for resources, plugins, users

### Before production readiness

- Add Redis caching layer for mc-api responses
- Add rate limiting
- Add auth middleware
- Add structured logging via `@mcbanners/logger`
- Add remote image fetching for server icons (currently base64 from mc-api response)
