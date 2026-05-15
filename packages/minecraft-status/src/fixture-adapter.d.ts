import type { McApiResponse } from "./mc-api-response";
import type { MinecraftStatusAdapter } from "./adapter";
import type { MinecraftServerStatus } from "./types";
/**
 * Fixture-backed MinecraftStatusAdapter.
 *
 * Backed by a Map keyed by `"host:port"`. Returns normalized status from the
 * matching fixture entry, or null for unknown servers.
 *
 * Intended for unit tests, local development, and integration smoke tests
 * without live Minecraft ping.
 */
export declare class FixtureMinecraftStatusAdapter implements MinecraftStatusAdapter {
  private readonly fixtures;
  constructor(fixtures: ReadonlyMap<string, McApiResponse>);
  getStatus(host: string, port: number): Promise<MinecraftServerStatus | null>;
}
/**
 * Creates a FixtureMinecraftStatusAdapter from a plain object map.
 * Keys must be `"host:port"` strings.
 */
export declare const createFixtureAdapter: (
  entries: Record<string, McApiResponse>
) => FixtureMinecraftStatusAdapter;
//# sourceMappingURL=fixture-adapter.d.ts.map
