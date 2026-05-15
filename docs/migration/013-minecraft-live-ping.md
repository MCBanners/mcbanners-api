# 013 — Minecraft Live Server Ping

## Context

Milestone 6 introduced the Minecraft server banner route backed by a
`FixtureMinecraftStatusAdapter`. Milestone 7 adds a real TCP ping implementation
so the API can serve live Minecraft server data without coupling route handlers
to any specific transport.

Milestone 7 hardening adds SRV record resolution, host/port input validation,
and safety limits on response sizes.

---

## Strategy: custom TCP SLP client (no new dependency)

The Minecraft **Server List Ping (SLP)** protocol (1.7+) is a two-packet TCP
exchange that returns a JSON status payload. The protocol is simple enough to
implement in ~150 lines of TypeScript with no new runtime dependencies.

### Why not an npm package?

| Option                                      | Verdict                                         |
| ------------------------------------------- | ----------------------------------------------- |
| `mc-ping-updated`, `bedrock-protocol`, etc. | Large or unmaintained; adds transitive deps     |
| Custom SLP implementation                   | ~200 LOC, zero deps, full control, easy to test |

The custom approach was chosen to keep the dependency tree minimal (a project
constraint) and to preserve direct control over timeout behavior, MOTD
normalization, and SRV resolution.

Reference: <https://wiki.vg/Server_List_Ping>

---

## Implementation

### Files added / modified

| File                                            | Purpose                                       |
| ----------------------------------------------- | --------------------------------------------- |
| `packages/minecraft-status/src/motd-utils.ts`   | MOTD text processing                          |
| `packages/minecraft-status/src/ping.ts`         | TCP SLP protocol client + safety limits       |
| `packages/minecraft-status/src/live-adapter.ts` | `LiveMinecraftStatusAdapter` (SRV + validate) |
| `packages/minecraft-status/src/srv.ts`          | `_minecraft._tcp` SRV record resolution       |
| `packages/minecraft-status/src/validate.ts`     | Host and port input validation                |

### Ping protocol flow

```
Client → Server: Handshake (0x00) + Status Request (0x00)
Server → Client: Status Response (0x00) — JSON payload
```

The JSON payload is converted to `McApiResponse` and fed into the existing
`normalizeMinecraftServerStatus` pipeline.

### SRV record resolution

Minecraft servers commonly publish `_minecraft._tcp.<host>` SRV records so
clients can connect without knowing the specific IP/port. The adapter performs
a SRV lookup before connecting:

```
_minecraft._tcp.mc.example.com → play.example.com:25578
```

**When SRV is used:**

- Only when `port === 25565` (the default). Providing any explicit non-default
  port signals that the caller has intentionally bypassed standard resolution.
- On SRV failure (any DNS error, no record, timeout) the original `host:25565`
  is used as a fallback.
- SRV is never required — it is a best-effort enhancement.

**Injecting a custom resolver (for tests):**

```typescript
const adapter = new LiveMinecraftStatusAdapter(3000, (host) =>
  Promise.resolve(host === "mc.example.com" ? { host: "127.0.0.1", port: 25578 } : null)
);
```

### Input validation

`validateHost` and `validatePort` run before any network I/O:

| Check            | Behaviour                                  |
| ---------------- | ------------------------------------------ |
| Empty host       | Returns null immediately (no error thrown) |
| Host > 253 chars | Returns null (RFC 1035 limit)              |
| Port < 1         | Returns null                               |
| Port > 65535     | Returns null                               |
| Non-integer port | Returns null                               |

All invalid inputs return `null` from `getStatus()` — matching the legacy
Java mc-api behaviour of returning null for unreachable servers.

### Safety limits

Enforced in `ping.ts` to prevent memory exhaustion or processing of
pathological server responses:

| Limit               | Value | Behaviour on exceed                     |
| ------------------- | ----- | --------------------------------------- |
| `MAX_PACKET_BYTES`  | 2 MB  | TCP connection aborted → null           |
| `MAX_FAVICON_BYTES` | 64 KB | Favicon dropped; rest of status kept    |
| `MAX_MOTD_LENGTH`   | 32 KB | Raw MOTD truncated before normalization |

### MOTD processing

The SLP description field can be a plain string, a legacy §-coded string, or a
JSON chat component object. `componentToLegacy()` converts chat components to
§-coded strings, mirroring Kyori Adventure's `LegacyComponentSerializer`.

The `raw` / `colorless` / `formatted` fields are then produced by:

| Field       | Processing                                                         |
| ----------- | ------------------------------------------------------------------ |
| `raw`       | `componentToLegacy(desc).trim()` (truncated to MAX_MOTD_LENGTH)    |
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

// Production — default 5s timeout, real DNS SRV
const adapter = new LiveMinecraftStatusAdapter();

// Production — custom timeout, custom SRV resolver
const adapter = new LiveMinecraftStatusAdapter(3000, myResolver);
```

The Hono app factory (`createApp(adapter)`) already accepts any adapter — no
route changes are required.

---

## Known differences from the Java mc-api

| Behaviour              | Java mc-api                                                                                       | This implementation                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| MOTD chat components   | Kyori Adventure full serializer (handles all component types including `score`, `selector`, etc.) | Simplified: handles `text`, `translate`, `color`, `bold`, `italic`, `underlined`, `strikethrough`, `obfuscated`, `extra` |
| MOTD `score` component | Renders `{score.name}:{score.objective}` value                                                    | **Produces empty string** (no score resolution)                                                                          |
| MOTD `selector` comp   | Renders matched entity names                                                                      | **Produces empty string** (no entity selector)                                                                           |
| MOTD `formatted`       | `MotdUtils.clean` (strips colors + non-ASCII + collapses whitespace)                              | Identical port                                                                                                           |
| RGB hex colors (1.16+) | Rendered as closest § code by Kyori Adventure                                                     | **Omitted** (no § equivalent)                                                                                            |
| MOTD length            | Unlimited                                                                                         | Truncated to 32 KB before normalization                                                                                  |
| Icon field             | Plain base64 string (raw PNG bytes, no prefix)                                                    | Data URI (`data:image/png;base64,...`) — matches existing `iconDataUrl` representation                                   |
| Icon size              | Unlimited                                                                                         | Dropped if > 64 KB                                                                                                       |
| SRV resolution         | Supported via MCProtocolLib (always attempted)                                                    | Attempted when `port === 25565`; falls back to `host:25565` on failure                                                   |
| Caching                | Spring `@Cacheable` (per-key, configurable TTL)                                                   | **None yet** (Milestone 8)                                                                                               |
| Bedrock/PE servers     | Not supported                                                                                     | Not supported                                                                                                            |
| Protocol version       | Sends client's actual protocol version                                                            | Sends 765 (1.20.4); irrelevant for status-only pings                                                                     |

---

## Manual testing

```bash
bun run scripts/ping-minecraft-server.ts <host> [port]

# Examples:
bun run scripts/ping-minecraft-server.ts mc.hypixel.net
bun run scripts/ping-minecraft-server.ts play.example.com 25575

# Server with favicon:
bun run scripts/ping-minecraft-server.ts mc.hypixel.net

# Explicit port (skips SRV lookup):
bun run scripts/ping-minecraft-server.ts mc.cubecraft.net 25565

# Server without favicon:
bun run scripts/ping-minecraft-server.ts mineplex.com
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

All tests are deterministic — no live Minecraft server or DNS resolver is required.

| Test suite                         | Approach                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| `motd-utils`                       | Unit tests: `componentToLegacy`, `stripColors`, `cleanMotd`                                       |
| VarInt codec                       | Unit tests: encode/decode round-trips, edge cases                                                 |
| `slpToMcApiResponse`               | Unit tests: field mapping, defaults, color cleaning, safety limits                                |
| `tryParseStatusResponse`           | Unit tests: complete packet, partial packet, fragmented                                           |
| `pingMinecraftServer`              | Mock TCP server (in-process) covering: happy path, TCP fragmentation, connection refused, timeout |
| `LiveMinecraftStatusAdapter`       | Mock TCP server: normalized output, null on unreachable                                           |
| `validateHost` / `validatePort`    | Unit tests: valid/invalid inputs, edge cases                                                      |
| SRV resolution (injected resolver) | Mock SRV resolver covering: hit, miss, skip on non-default port, resolver throws                  |
| Safety limits                      | Oversized packet aborts; oversized favicon dropped; oversized MOTD truncated                      |
| MOTD edge cases                    | RGB hex colors, score/selector components, deeply nested extra, multiline                         |

Route tests in `apps/api/test/` remain fixture-backed and are unaffected.

---

## Remaining gaps before production use

- **Redis caching** (Milestone 8) — avoid hammering servers on each request
- **Bedrock/PE support** — different UDP-based protocol; out of scope
- **Rate limiting / abuse protection** — needed before public deployment
