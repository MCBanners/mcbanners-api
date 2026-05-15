# 003 Testing Strategy

## Milestone 1 tests

Current tests validate that the compatibility manifest:

- Loads through its Zod schema.
- Preserves contiguous Java `BannerType` ordinals.
- Keeps output aliases as `png` and `jpg`.
- Has no duplicate `namespace__key` settings within each banner kind.
- Preserves first-class `/banner/*` and `/mc/*` route families.

## Future compatibility tests

Add snapshot tests before implementing real route handlers:

- Public route matrix request/response behavior.
- Saved banner recall fixtures with real `saved_banner` rows.
- Default settings response parity for `/banner/svc/defaults/:type`.
- Constants response parity for `/banner/svc/constants`.
- PNG/JPG content type and encoding checks.
- Minecraft status JSON shape parity.
- Discord command URL construction parity.

## Future renderer tests

Renderer tests should use deterministic fixtures and image snapshots with tolerances. Start with one fixture per banner type and expand around regressions.
