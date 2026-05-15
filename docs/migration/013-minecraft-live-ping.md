# 013 — Minecraft Live Server Ping

## Context

Milestone 6 introduced the Minecraft server banner route backed by a
`FixtureMinecraftStatusAdapter`. Milestone 7 adds a real TCP ping implementation
so the API can serve live Minecraft server data without coupling route handlers
to any specific transport.

---

## Strategy: custom TCP SLP client (no new dependency)

The Minecraft **Server List Ping (SLP)** protocol (1.7+) is a two-packet TCP
exchange that returns a JSON status payload. The protocol is simple enough to
implement in ~150 lines of TypeScript with no new runtime dependencies.

### Why not an npm package?

| Option                                      | Verdict                                         |
| ------------------------------------------- | ----------------------------------------------- |
| `mc-ping-updated`, `bedrock-protocol`, etc. | Large or unmaintained; adds transitive deps     |
| Custom SLP implementation                   | ~150 LOC, zero deps, full control, easy to test |

The custom approach was chosen to keep the dependency tree minimal (a project
constraint) and to preserve direct control over timeout behavior and MOTD
normalization.

Reference: <https://wiki.vg/Server_List_Ping>

---

## Implementation

### Files added

| File                                            | Purpose                      |
| ----------------------------------------------- | ---------------------------- |
| `packages/minecraft-status/src/motd-utils.ts`   | MOTD text processing         |
| `packages/minecraft-status/src/ping.ts`         | TCP SLP protocol client      |
| `packages/minecraft-status/src/live-adapter.ts` | `LiveMinecraftStatusAdapter` |

### Ping protocol flow

```
Client → Server: Handshake (0x00) + Status Request (0x00)
Server → Client: Status Response (0x00) — JSON payload
```

The JSON payload is converted to `McApiResponse` and fed into the existing
`normalizeMinecraftServerStatus` pipeline.

### MOTD processing

The SLP description field can be a plain string, a legacy §-coded string, or a
JSON chat component object. `componentToLegacy()` converts chat components to
§-coded strings, mirroring Kyori Adventure's `LegacyComponentSerializer`.

The `raw` / `colorless` / `formatted` fields are then produced by:

| Field       | Processing                                                         |
| ----------- | ------------------------------------------------------------------ |
| `raw`       | `componentToLegacy(desc).trim()`                                   |
| `colorless` | `stripColors(raw)` — strips `§x` codes                             |
| `formatted` | `cleanMotd(raw)` — strips codes + non-ASCII + collapses whitespace |

`cleanMotd` is a direct port of Java `MotdUtils.clean` from mc-api.

### Favicon / icon

The SLP protocol delivers the server icon as a `data:image/png;base64,...` data
URI. This is kept as-is and stored in the `icon` field of `McApiResponse`,
matching the existing `iconDataUrl` representation.

> Note: the legacy Java mc-api's `ServerStatusService` internally decoded the
> icon from the data URI to raw bytes (via MCProtocolLib) and then re-encoded as
> plain base64. Our new implementation skips that round-trip and preserves the
> data URI directly from the SLP response.

---

## Timeout behavior

| Setting            | Value                                                           |
| ------------------ | --------------------------------------------------------------- |
| Default timeout    | 5 000 ms (matches legacy mc-api `TimeUnit.SECONDS.toMillis(5)`) |
| Implementation     | `socket.setTimeout(timeoutMs)`                                  |
| On timeout         | `done(null)` — same as legacy returning `null`                  |
| On error / refused | `done(null)`                                                    |

The `LiveMinecraftStatusAdapter` constructor accepts a `timeoutMs` parameter
for override (useful in tests).

---

## Adapter wiring

`MinecraftStatusAdapter` is unchanged. Callers swap adapters at construction time:

```typescript
// Tests / local dev
const adapter = createFixtureAdapter(MC_STATUS_FIXTURES);

// Production
const adapter = new LiveMinecraftStatusAdapter(); // 5s default timeout
```

The Hono app factory (`createApp(adapter)`) already accepts any adapter — no
route changes are required.

---

## Known differences from the Java mc-api

| Behaviour              | Java mc-api                                                                                       | This implementation                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| MOTD chat components   | Kyori Adventure full serializer (handles all component types including `score`, `selector`, etc.) | Simplified: handles `text`, `translate`, `color`, `bold`, `italic`, `underlined`, `strikethrough`, `obfuscated`, `extra` |
| MOTD `formatted`       | `MotdUtils.clean` (strips colors + non-ASCII + collapses whitespace)                              | Identical port                                                                                                           |
| RGB hex colors (1.16+) | Rendered as closest § code by Kyori Adventure                                                     | **Omitted** (no § equivalent)                                                                                            |
| Icon field             | Plain base64 string (raw PNG bytes, no prefix)                                                    | Data URI (`data:image/png;base64,...`) — matches existing `iconDataUrl` representation                                   |
| Caching                | Spring `@Cacheable` (per-key, configurable TTL)                                                   | **None yet** (Milestone 8)                                                                                               |
| SRV record resolution  | Supported via MCProtocolLib                                                                       | **Not implemented** — use resolved hostname                                                                              |
| Bedrock/PE servers     | Not supported                                                                                     | Not supported                                                                                                            |
| Protocol version       | Sends client's actual protocol version                                                            | Sends 765 (1.20.4); irrelevant for status-only pings                                                                     |

---

## Manual testing

```bash
bun run scripts/ping-minecraft-server.ts <host> [port]

# Examples:
bun run scripts/ping-minecraft-server.ts mc.hypixel.net
bun run scripts/ping-minecraft-server.ts play.example.com 25575
```

Expected output:

```
Pinging mc.hypixel.net:25565 ...
✅  mc.hypixel.net:25565 responded in 142ms

  Version   : Requires MC 1.8 / 1.21
  Players   : 42318 / 200000
  MOTD raw  : §aHypixel Network  §c[1.8-1.21]
  MOTD clean: Hypixel Network  [1.8-1.21]
  Icon      : yes (data URI)
```

---

## Test strategy

All tests are deterministic — no live Minecraft server is required.

| Test suite                   | Approach                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `motd-utils`                 | Unit tests: `componentToLegacy`, `stripColors`, `cleanMotd`                                       |
| VarInt codec                 | Unit tests: encode/decode round-trips, edge cases                                                 |
| `slpToMcApiResponse`         | Unit tests: field mapping, defaults, color cleaning                                               |
| `tryParseStatusResponse`     | Unit tests: complete packet, partial packet, fragmented                                           |
| `pingMinecraftServer`        | Mock TCP server (in-process) covering: happy path, TCP fragmentation, connection refused, timeout |
| `LiveMinecraftStatusAdapter` | Mock TCP server: normalized output, null on unreachable                                           |

Route tests in `apps/api/test/` remain fixture-backed and are unaffected.

---

## Remaining gaps before production use

- **SRV record resolution** — needed for servers that publish `_minecraft._tcp` SRV records
- **Redis caching** (Milestone 8) — avoid hammering servers on each request
- **Bedrock/PE support** — different protocol; out of scope for this milestone
- **Rate limiting / abuse protection** — needed before public deployment
