import type { McApiResponse } from "./mc-api-response";
import { normalizeMinecraftServerStatus } from "./normalize";
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
export class FixtureMinecraftStatusAdapter implements MinecraftStatusAdapter {
  private readonly fixtures: ReadonlyMap<string, McApiResponse>;

  constructor(fixtures: ReadonlyMap<string, McApiResponse>) {
    this.fixtures = fixtures;
  }

  getStatus(host: string, port: number): Promise<MinecraftServerStatus | null> {
    const key = `${host}:${String(port)}`;
    const raw = this.fixtures.get(key);
    if (raw === undefined) return Promise.resolve(null);
    return Promise.resolve(normalizeMinecraftServerStatus(raw));
  }
}

/**
 * Creates a FixtureMinecraftStatusAdapter from a plain object map.
 * Keys must be `"host:port"` strings.
 */
export const createFixtureAdapter = (
  entries: Record<string, McApiResponse>
): FixtureMinecraftStatusAdapter =>
  new FixtureMinecraftStatusAdapter(new Map(Object.entries(entries)));
