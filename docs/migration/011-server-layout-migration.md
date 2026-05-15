# 011 — Server Layout Migration

## Status: Complete

Milestone 5 ports the Minecraft server banner rendering pipeline as the first real compatibility
layout. The full stack — from raw query parameters to deterministic PNG/JPG output — is exercised
end-to-end, fixture-driven, with no live API calls or Hono routes.

---

## Legacy Source References

| Java file                     | Ported behaviour                                                       |
| ----------------------------- | ---------------------------------------------------------------------- |
| `ServerLayout.java`           | Component ordering, logo/text/MOTD/players pipeline                    |
| `ServerParameters.java`       | All default coordinates, font sizes, enable flags, fontFace, textAlign |
| `Layout.java`                 | `LIGHT_TEXT` / `DARK_TEXT` color constants and textTheme lookup        |
| `WrappableTextComponent.java` | Wrap width formula (`wrapRightEdge − motd.x`), maxChars                |
| `LogoComponent.java`          | Logo vertical centering, maxLogoSize=96 cap                            |

---

## Canvas Dimensions

The server banner canvas is **300 × 100 pixels**, matching the legacy `ImageBuilder` dimensions
used in `ServerLayout.java`.

---

## File Structure

```
packages/banner-renderer/src/
  compat/
    font-face.ts       FontFace (UPPER_SNAKE) → RendererFontFace (lowercase-hyphen)
    text-align.ts      TextAlign (LEFT/CENTER/RIGHT) → RendererTextAlign
    text-theme.ts      LIGHT_TEXT_COLOR, DARK_TEXT_COLOR, resolveTextColor()
    index.ts           barrel

  layouts/
    server/
      server-banner-data.ts     ServerBannerData interface (fixture input shape)
      server-banner-settings.ts ServerBannerSettings / ServerBannerTextSettings interfaces
      server-banner-defaults.ts Constants + DEFAULT_SERVER_BANNER_SETTINGS
      server-banner-params.ts   parseServerBannerSettings(rawQuery) → ServerBannerSettings
      server-banner-layout.ts   buildServerBannerNodes(data, settings) → readonly RenderNode[]
      index.ts                  barrel
    index.ts                    barrel

packages/banner-renderer/test/
  fixtures/
    server-fixtures.ts          Synthetic fixtures (no live API calls)
  server-layout-nodes.test.ts   Param parsing + node generation tests + snapshots
  server-layout-render.test.ts  Deterministic PNG/JPG render + hash stability tests

packages/banner-renderer/scripts/
  render-server-fixture.ts      CLI script: renders all fixtures to output/server/
```

---

## Compat Layer

### FontFace mapping

Domain uses `UPPER_SNAKE_CASE` (e.g. `SOURCE_SANS_PRO`).
The renderer uses lowercase-hyphen (e.g. `source-sans-pro`).
`mapFontFace()` converts between them.

### TextAlign mapping

Domain uses uppercase (`LEFT`, `CENTER`, `RIGHT`).
Renderer uses lowercase (`left`, `center`, `right`).
`mapTextAlign()` converts between them.

### Text colour

Ported directly from `Layout.java`:

```
LIGHT_TEXT_COLOR = rgba(230, 224, 224)  — used with MOONLIGHT_PURPLE, BURNING_ORANGE, etc.
DARK_TEXT_COLOR  = rgba(65, 60, 60)    — used with BLUE_RADIAL, MANGO, LIGHT_MODE, etc.
```

`resolveTextColor(textTheme)` accepts the `TextTheme` enum value returned by
`getBackgroundTemplateTextTheme()` from `@mcbanners/domain`.

---

## Default Settings

All defaults are ported verbatim from `ServerParameters.java`.
Do not adjust without verifying against the legacy source.

| Field      | x   | y              | fontSize | fontBold |
| ---------- | --- | -------------- | -------- | -------- | ------------------- |
| background | —   | —              | —        | —        | MOONLIGHT_PURPLE    |
| logo       | 12  | (auto-centred) | —        | —        | size=80, maxSize=96 |
| serverName | 104 | 22             | 18       | true     |
| version    | 104 | 38             | 14       | false    |
| motd       | 104 | 55             | 14       | false    |
| players    | 104 | 85             | 14       | false    |

Logo `y` is computed as `floor((100 − logoSize) / 2)`.

MOTD `maxWidth` = `SERVER_BANNER_WRAP_RIGHT_EDGE (295) − motd.x`.  
MOTD `lineHeight` = `motd.fontSize`.

---

## Query Parameter Namespaces

Parameters follow the legacy compatibility manifest key format:

```
background__template
logo__x  logo__size
server_name__{x,y,font_size,font_bold,font_face,text_align,display,enable,max_chars}
version__{...}
motd__{...}
players__{...}
```

`parseServerBannerSettings(rawQuery)` uses `readBooleanParameter`, `readIntegerParameter`,
`readEnumParameter`, and `readStringParameter` from `@mcbanners/domain` settings utilities.

---

## Node Generation

`buildServerBannerNodes(data, settings)` returns nodes in painting order:

1. **ImageNode** — background (full canvas, `assetKey = background.template`)
2. **ImageNode** (with `imageData`) — server icon, if `data.iconBase64 !== null`
   **SpriteNode** (`DEFAULT_SERVER_LOGO`) — fallback when no icon
3. **TextNode** — server name (omitted when `serverName.enable = false`)
4. **TextNode** — version (omitted when `version.enable = false`)
5. **WrappedTextNode** — MOTD (omitted when `motd.enable = false`)
6. **TextNode** — players `"X / Y players online"` (omitted when `players.enable = false`)

`display` overrides the computed content string when non-empty (mirrors Java `display` field).

`maxChars < 9999` is included on `WrappedTextNode`; otherwise the field is omitted entirely
(required by `exactOptionalPropertyTypes`).

---

## TypeScript Project References

`banner-renderer/tsconfig.build.json` now declares a project reference to
`../domain/tsconfig.build.json`. This is required because:

- `banner-renderer` imports types from `@mcbanners/domain`
- TypeScript composite projects enforce that referenced packages are pre-built

The root `tsconfig.build.json` already lists both packages as references; build order is resolved
automatically by `tsc -b`.

---

## Test Coverage

| Test file                      | Coverage                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `server-layout-nodes.test.ts`  | 9 param-parsing cases, 20 node-generation cases, 2 snapshots, 5 fixture smoke tests                                                 |
| `server-layout-render.test.ts` | PNG/JPG signature checks, determinism (same input → same hash), cross-fixture diff hash, visual output to `output/server-fixtures/` |

Snapshot files are committed alongside the test files and serve as regression guards for node
shape changes.

---

## Determinism Strategy

All rendering is deterministic:

- Node generation depends only on `ServerBannerData` + `ServerBannerSettings` (pure value types)
- `renderNode()` writes to `@napi-rs/canvas` which produces byte-identical output for identical
  pixel operations in the same process
- PNG encoding via `canvas.encode("png")` is deterministic
- JPEG quality is fixed at 90 (the legacy default)
- SHA-256 hash checks confirm stability across repeated renders

---

## Remaining Gaps Before API Route Integration

1. **No live Minecraft ping** — `ServerBannerData` must be supplied by the caller; mc-api
   integration is a future milestone.
2. **No Hono route** — the layout pipeline is not yet wired to any HTTP endpoint.
3. **No caching** — each render creates a fresh surface.
4. **No remote image fetch** — `iconBase64` must be pre-resolved before calling the layout
   builder; remote fetching is a future concern.
5. **No other layout types** — ResourceLayout, PlayerLayout, etc. are not yet ported.
