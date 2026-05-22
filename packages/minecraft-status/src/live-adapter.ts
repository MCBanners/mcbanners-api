import type { MinecraftStatusAdapter } from "./adapter";
import { normalizeMinecraftServerStatus } from "./normalize";
import { pingMinecraftServer } from "./ping";
import { resolveMcSrv, type SrvResolver } from "./srv";
import type { MinecraftServerStatus } from "./types";
import { validateHost, validatePort } from "./validate";

/** Default TCP port for Minecraft Java Edition servers. */
const DEFAULT_MC_PORT = 25565;

/**
 * Live MinecraftStatusAdapter that pings real Minecraft servers using the
 * Server List Ping (SLP) protocol over TCP.
 *
 * SRV resolution:
 *   When `port` equals the default (25565), this adapter first attempts an
 *   `_minecraft._tcp.<host>` SRV lookup. If a record is found, the resolved
 *   host and port are used. If the lookup fails, the original host:25565 is
 *   used. SRV is skipped when an explicit non-default port is provided.
 *
 * Returns null on invalid input, timeout, connection refused, or any protocol
 * error — matching the legacy Java mc-api behaviour of returning null.
 *
 * Use FixtureMinecraftStatusAdapter in tests; this adapter is intended for
 * production use.
 */
export class LiveMinecraftStatusAdapter implements MinecraftStatusAdapter {
  private readonly timeoutMs: number;
  private readonly srvResolver: SrvResolver;

  /**
   * @param timeoutMs    - Per-ping TCP timeout in milliseconds.
   *   Defaults to 5000 to match legacy mc-api behaviour.
   * @param srvResolver  - SRV resolver function. Defaults to the real DNS
   *   resolver; pass a custom function in tests to avoid live DNS lookups.
   */
  constructor(timeoutMs = 5000, srvResolver: SrvResolver = resolveMcSrv) {
    this.timeoutMs = timeoutMs;
    this.srvResolver = srvResolver;
  }

  async getStatus(host: string, port: number): Promise<MinecraftServerStatus | null> {
    if (validateHost(host) !== null) return null;
    if (validatePort(port) !== null) return null;

    try {
      let resolvedHost = host;
      let resolvedPort = port;

      // SRV lookup only when using the default port — an explicit non-default
      // port means the caller intentionally bypassed standard resolution.
      if (port === DEFAULT_MC_PORT) {
        const srv = await this.srvResolver(host);
        if (srv !== null) {
          resolvedHost = srv.host;
          resolvedPort = srv.port;
        }
      }

      const raw = await pingMinecraftServer(resolvedHost, resolvedPort, this.timeoutMs);
      if (raw === null) return null;
      return normalizeMinecraftServerStatus(raw);
    } catch {
      return null;
    }
  }
}
