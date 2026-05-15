# 008 Canvas Spike Plan

## Primary Target

Use `@napi-rs/canvas` as the primary spike target. Do not add it to production dependencies until the spike proves the requirements below.

## Fallback

Use `skia-canvas` as the fallback if `@napi-rs/canvas` cannot satisfy runtime, packaging, font, or encoding requirements on Bun.

## What The Spike Must Prove

- Bun can import and execute the canvas package on local Windows.
- The same code path can run under Docker/Linux.
- PNG and JPG output can be encoded from a canvas buffer.
- All legacy fonts can be registered with stable family names.
- Background PNGs and sprite PNGs can be decoded from the planned asset paths.
- Text rendering supports the legacy regular/bold font choices closely enough for visual fixture work.
- The renderer can produce deterministic dimensions and non-empty image bytes.

## Font Registration Requirements

- Register every `FontFace` regular and bold TTF.
- Preserve the Java filename mapping documented in the domain manifest.
- Decide and document family names before layout porting.
- Validate missing font failures at startup.

## PNG/JPG Encoding Requirements

- Preserve legacy public output aliases: `png` and `jpg`.
- Confirm MIME/content-type expectations before wiring API routes later.
- Verify JPEG background handling for alpha/transparency behavior before comparing visual fixtures.

## Bun Runtime Compatibility Checks

- Run the spike with `bun run`.
- Run Bun tests that import the canvas package.
- Verify package install does not require trusted lifecycle scripts beyond a documented decision.
- Confirm the package works with the current pinned Bun version.

## Docker/Linux Considerations

- Verify native package availability on Linux.
- Document required system libraries if any are needed.
- Prefer a reproducible Docker smoke command before renderer implementation work.
- Keep Windows development and Linux deployment parity explicit.

## Visual Fixture Expectations

Start with fixture images for:

- One background-only render.
- One font registration/text render.
- One sprite overlay render.
- One composed resource banner skeleton once layout porting begins.

Fixture checks should include dimensions, non-empty buffers, stable encoding, and eventually perceptual/pixel tolerance comparisons against legacy outputs.

## Dependency Decision

Recommendation: copy the legacy assets and add `@napi-rs/canvas` in the next milestone only for the spike branch/work. Do not add canvas dependencies to production code until the spike documents install/runtime behavior and visual fixture viability.
