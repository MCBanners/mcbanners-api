# 009 Canvas Spike Results

Milestone 3b proves that `@napi-rs/canvas` can run under Bun against the copied
legacy renderer assets. This is a runtime spike only; it is not the final banner
scene graph, layout engine, or rendering API.

## Scope

The spike module lives at `packages/banner-renderer/src/canvas/spike.ts` and:

- Validates the copied asset manifest before rendering.
- Registers `fonts/InterRegular.ttf` through `GlobalFonts.registerFromPath()`.
- Loads `banner/blue_radial.png` with `loadImage()`.
- Loads and draws `sprites/star_full.png`.
- Draws a small text sample.
- Encodes PNG bytes.
- Encodes JPG bytes.
- Writes generated outputs to `packages/banner-renderer/output/canvas-spike`,
  which is gitignored.

## Bun Compatibility

`@napi-rs/canvas@1.0.0` loaded and executed under Bun `1.3.14` on Windows. The
test suite successfully created a canvas, accessed the 2D context, loaded copied
assets, registered a font, rendered a sample image, and encoded PNG/JPG buffers.

The package is intentionally installed only in `packages/banner-renderer`.

## Font Registration Behavior

`GlobalFonts.registerFromPath()` successfully registered the copied Inter
regular font from the manifest-resolved path. The spike uses a local alias,
`MCBanners Canvas Spike Inter`, to avoid depending on platform font family
resolution.

The call returns `null` on registration failure, so production startup checks
should treat a `null` return as a hard renderer startup error.

## Image Loading Behavior

`loadImage()` successfully loaded copied PNG assets from filesystem paths
resolved through `resolveAssetPath()`. This keeps the spike tied to the same
path-safety and hash validation policy used by asset startup checks.

## PNG And JPG Encoding Behavior

The spike uses async `canvas.encode("png")` and `canvas.encode("jpeg", 90)`.
Both produced non-empty buffers with the expected file signatures during tests.

Observed local output sizes:

- `canvas-spike.png`: 7091 bytes
- `canvas-spike.jpg`: 5143 bytes

These generated binaries are not committed.

## Windows Notes

The Windows x64 native binding installed and loaded successfully through Bun.
No extra system packages were needed on the local Windows environment for this
spike.

Because `bunfig.toml` freezes normal installs, the dependency update required a
deliberate lockfile update and then restoring the frozen lockfile policy.

## Docker And Linux Concerns

Linux CI or Docker verification still needs to prove the selected image includes
the native package target expected by `@napi-rs/canvas`. The package publishes
multiple native targets, including GNU and musl Linux builds, but the Docker
base image choice should be tested before renderer production adoption.

Future CI should run the canvas spike tests in the same Linux image intended for
deployment.

## Decision

`@napi-rs/canvas` is accepted for Milestone 3 continuation based on this local
Bun/Windows spike. No fallback research with `skia-canvas` is needed unless the
Linux/Docker verification fails or the full renderer exposes unsupported canvas
behavior.
