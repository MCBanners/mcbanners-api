# Live Hytale Smoke Tests

The live Hytale smoke tests are opt-in checks for the API-side Hytale server
status path. They are not part of normal CI and normal `bun test` remains
fixture-only and deterministic.

These tests depend on public third-party servers. A failure can mean the
configured servers are offline, stale, rate-limiting, blocking UDP, or not
running a supported query protocol; it does not automatically mean the API is
broken.

Use at least three candidate servers when running the smoke locally. Candidate
servers can become stale, so pass them through `HYTALE_LIVE_SERVERS` rather than
hardcoding them as required fixtures.

PowerShell:

```powershell
$env:LIVE_HYTALE_STATUS_TESTS="1"
$env:HYTALE_LIVE_SERVERS="play.hylife.gg:5520,craftzone.gg:5520,jadeberry.net:5520"
bun test packages/hytale-status/test/live-hytale-status.test.ts apps/api/test/server-banner.live.test.ts
```

Bash:

```bash
LIVE_HYTALE_STATUS_TESTS=1 HYTALE_LIVE_SERVERS="play.hylife.gg:5520,craftzone.gg:5520,jadeberry.net:5520" bun test packages/hytale-status/test/live-hytale-status.test.ts apps/api/test/server-banner.live.test.ts
```

The package-level smoke probes each configured server sequentially and passes if
at least one returns a usable status. The API smoke uses the first reachable
configured server to verify:

- `GET /banner/server/hytale/:host/:port/isValid`
- `GET /banner/server/hytale/:host/:port/banner.png`

Keep these tests manual and opt-in. Do not add public Hytale servers to required
CI unless the workflow remains disabled by default.
