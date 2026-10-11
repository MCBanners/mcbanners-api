import type { MinecraftServerStatus } from "./types";

/**
 * Abstraction over a source of Minecraft server status data.
 *
 * Implementations may be fixture-backed (for tests/dev) or live (real mc-api
 * HTTP calls). The interface keeps callers decoupled from the data source.
 */
export interface MinecraftStatusAdapter {
  /**
   * Returns the status for the given host/port, or null when the server is
   * unreachable or unknown.
   */
  getStatus(host: string, port: number): Promise<MinecraftServerStatus | null>;
  /** Optional cached form that returns the exact cache version used. */
  getStatusWithFreshness?(
    host: string,
    port: number
  ): Promise<{
    value: MinecraftServerStatus | null;
    token: symbol | undefined;
  }>;
}
