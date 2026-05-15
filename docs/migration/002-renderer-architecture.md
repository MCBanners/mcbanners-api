# 002 Renderer Architecture

## Target

The future renderer should live in `packages/banner-renderer` and primarily use `@napi-rs/canvas`.

## Constraints

- Do not treat Bun image APIs as the core rendering surface.
- Keep the render contract independent from HTTP route handlers.
- Keep legacy setting names and defaults in `packages/domain`.
- Keep output format handling compatible with `png` and `jpg`.

## Future package boundary

Expected future flow:

1. API route parses public route, metadata, output format, and `namespace__key` settings.
2. Domain package validates and normalizes compatibility input.
3. External client or Minecraft status package fetches source data.
4. Renderer package receives typed render input and returns encoded image bytes.

This milestone only creates placeholders and the compatibility manifest.
