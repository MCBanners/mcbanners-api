# 010 Render Node Architecture

## Purpose

Milestone 4 introduces the serializable render-node system and deterministic
renderer primitives that all future banner layouts will use. This document
records the design decisions made for this layer and the constraints they must
satisfy.

## Goals

1. Define a JSON-serializable, function-free render node tree that layouts can
   construct without touching canvas internals.
2. Implement the low-level renderer primitives that consume those nodes and
   draw onto an `@napi-rs/canvas` surface.
3. Port the legacy text-alignment and word-wrap algorithms so existing banner
   visual behavior is preserved.
4. Keep rendering deterministic: identical node trees must always produce
   identical byte output.

## Non-Goals

This milestone does **not** include:

- Java layout ports (`ResourceLayout`, `ServerLayout`, etc.)
- API route handlers or HTTP plumbing
- Remote image fetching
- External renderer abstraction layers

## Package Location

All new code lives in `packages/banner-renderer/src/` under four sub-directories:

```
types/      — renderer-safe primitive types (no canvas imports)
nodes/      — serializable render node interfaces
text/       — deterministic text measurement and layout helpers
renderer/   — canvas-backed rendering primitives
```

## Render Node Types

Every node is a plain interface with a string literal `type` discriminant,
enabling standard TypeScript narrowing. All fields are `readonly` to prevent
accidental mutation. No class instances, no functions, no Buffers.

| Node type      | Key fields                                            | Canvas primitives used   |
| -------------- | ----------------------------------------------------- | ------------------------ |
| `text`         | content, fontFace, fontWeight, fontSize, color, align | `fillText`               |
| `wrapped-text` | content + maxWidth, lineHeight, optional maxChars     | `fillText` × N lines     |
| `image`        | assetKey **or** imageData (base64)                    | `drawImage`              |
| `sprite`       | assetKey (manifest only)                              | `drawImage`              |
| `debug`        | label, width, height, color                           | `strokeRect`, `fillText` |

### JSON-Serializability Contract

- All node types contain only `number`, `string`, and plain-object values.
- Optional `maxChars` on `WrappedTextNode` uses `undefined`; when absent it
  does not appear in the serialized JSON.
- `RgbaColor` is `{ r, g, b, a }` with all values as 0–255 integers; this
  round-trips cleanly through `JSON.stringify` / `JSON.parse`.
- `imageData` on `ImageNode` encodes arbitrary image bytes as a base64 string,
  which is JSON-safe and avoids embedding non-serializable Buffers in the tree.

## Renderer-Safe Primitive Types

| Type                | Definition                           | Notes                                  |
| ------------------- | ------------------------------------ | -------------------------------------- |
| `RgbaColor`         | `{ r, g, b, a }` 0–255 integers      | `rgbaColorToString` → CSS `rgba()`     |
| `FontWeight`        | `"regular" \| "bold"`                |                                        |
| `RendererFontFace`  | `"inter" \| "montserrat" \| ...`     | Lowercase, hyphen-separated            |
| `RendererTextAlign` | `"left" \| "center" \| "right"`      |                                        |
| `RenderSurface`     | `{ canvas, context, width, height }` | Holds live canvas references; not JSON |
| `RenderResult`      | `{ format, bytes }`                  | Output of encode primitives            |

`RendererFontFace` is distinct from the domain-level `FontFace` (UPPER_SNAKE
uppercase). Conversion between the two types will be added when layout code
is ported.

## Font Registry

All bundled fonts are registered at startup via `registerRendererFonts()`.
Each variant (regular and bold for all 8 faces = 16 files) is registered
under a stable, namespaced family name:

```
MCBanners.{DisplayName}.{Regular|Bold}
```

Examples: `MCBanners.Inter.Bold`, `MCBanners.SourceSansPro.Regular`.

The namespaced family names ensure no collision with system fonts and remain
stable across platforms. `registerRendererFonts()` is idempotent; repeated
calls are no-ops.

`buildFontSpec(fontFace, fontWeight, fontSize)` produces a CSS font shorthand
string (`'20px "MCBanners.Inter.Bold"'`) for direct assignment to
`context.font`.

## Text Alignment Semantics

`computeAlignedX` preserves the alignment semantics of the legacy Java
`ImageUtil.drawText`:

- `"left"`: draw at `x` directly.
- `"center"`: `(surfaceWidth − textWidth) / 2 + x`
- `"right"`: `surfaceWidth − textWidth + x`

For both `center` and `right`, the `x` parameter acts as an additional offset
after the base alignment calculation. This matches the legacy behavior where
`initialX` was added to the computed position.

## Word Wrap Algorithm

`wrapText(measurer, text, maxWidth)` is a direct port of the legacy Java
`StringUtil.wrap` / `StringUtil.wrapLineInto` algorithm:

1. Split the input on existing CR, LF, or CRLF boundaries.
2. For each physical line, iteratively measure and split at whitespace or
   hyphen break points using a proportional guess heuristic.
3. When no break point exists, split at the guess offset (mid-word cut).
4. Trim leading and trailing whitespace from each output line.

The function accepts a `TextMeasurer = (text: string) => number` callback
instead of a canvas context directly, enabling pure unit testing without a
live canvas surface.

## Truncation Algorithm

`truncateText(text, maxChars)` mirrors Java `StringUtil.truncateAfter` which
uses `BreakIterator.getWordInstance().preceding(maxChars)`:

1. If `maxChars >= text.length`, return the original string.
2. Walk backward from `maxChars` to find a whitespace boundary.
3. If a whitespace boundary is found, return the text up to that position
   (trailing whitespace trimmed).
4. If no boundary is found, return exactly `text.slice(0, maxChars)`.

## Renderer Primitives

| Function                | Signature                                     |
| ----------------------- | --------------------------------------------- |
| `createCanvasSurface`   | `(width, height) → RenderSurface`             |
| `renderTextNode`        | `(surface, node: TextNode) → void`            |
| `renderWrappedTextNode` | `(surface, node: WrappedTextNode) → void`     |
| `renderImageNode`       | `(surface, node: ImageNode) → Promise<void>`  |
| `renderSpriteNode`      | `(surface, node: SpriteNode) → Promise<void>` |
| `renderDebugNode`       | `(surface, node: DebugNode) → void`           |
| `renderNode`            | `(surface, node: RenderNode) → Promise<void>` |
| `encodePng`             | `(surface) → Promise<Buffer>`                 |
| `encodeJpg`             | `(surface, quality?) → Promise<Buffer>`       |

`renderNode` is a dispatch helper that routes any `RenderNode` to the
appropriate primitive. It is exhaustive over all discriminant values.

## Determinism

The renderer relies on `@napi-rs/canvas` with:

- Fixed font registration (bundled TTF files, stable paths).
- Deterministic draw order (caller-controlled).
- No date, random, or environment-dependent values in the render path.
- JPEG quality fixed at 90 to match the legacy `BannerImageWriter` default.

Tests in `test/determinism.test.ts` verify that identical node trees produce
identical SHA-256 hashes across multiple calls.

## Snapshot Strategy

- `render-nodes.test.ts` uses `toMatchSnapshot()` to lock in the shape of
  each serialized node.
- `determinism.test.ts` computes SHA-256 hashes of image buffers and asserts
  equality across two calls, proving byte-level determinism without committing
  large binary artifacts.

## Remaining Limitations Before Layout Migration

1. **No layout engine**: This layer only renders individual nodes. Banner
   layouts must construct the node tree themselves.
2. **No external image fetching**: `ImageNode` supports pre-loaded bytes via
   `imageData` (base64), but callers must fetch and encode before building
   the node.
3. **No domain FontFace mapping**: `RendererFontFace` uses lowercase hyphenated
   names; a converter from domain `FontFace` (UPPER_SNAKE) is needed before
   layout ports.
4. **No background overlay helper**: The legacy layouts apply a semi-transparent
   overlay after drawing the background. This is currently a manual canvas
   operation; a dedicated node type may be added when layouts are ported.
5. **No image caching**: Each `renderImageNode`/`renderSpriteNode` call reads
   from disk. A manifest-keyed in-memory cache should be added for production
   use.
