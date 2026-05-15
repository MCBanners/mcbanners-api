import { pingMinecraftServer } from "./ping";
import { normalizeMinecraftServerStatus } from "./normalize";
import type { MinecraftStatusAdapter } from "./adapter";
import type { MinecraftServerStatus } from "./types";

/**
 * Live MinecraftStatusAdapter that pings real Minecraft servers using the
 * Server List Ping (SLP) protocol over TCP.
 *
 * Returns null on timeout, connection refused, or any protocol error — the
 * same behaviour as the legacy Java mc-api returning null.
 *
 * Use FixtureMinecraftStatusAdapter in tests; this adapter is intended for
 * production use.
 */
export class LiveMinecraftStatusAdapter implements MinecraftStatusAdapter {
  private readonly timeoutMs: number;

  /**
   * @param timeoutMs - Per-ping TCP timeout in milliseconds.
   *   Defaults to 5000 to match legacy mc-api behaviour.
   */
  constructor(timeoutMs = 5000) {
    this.timeoutMs = timeoutMs;
  }

  async getStatus(host: string, port: number): Promise<MinecraftServerStatus | null> {
    try {
      const raw = await pingMinecraftServer(host, port, this.timeoutMs);
      if (raw === null) return null;
      return normalizeMinecraftServerStatus(raw);
    } catch {
      return null;
    }
  }
}
