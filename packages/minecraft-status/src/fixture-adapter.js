import { normalizeMinecraftServerStatus } from "./normalize";
/**
 * Fixture-backed MinecraftStatusAdapter.
 *
 * Backed by a Map keyed by `"host:port"`. Returns normalized status from the
 * matching fixture entry, or null for unknown servers.
 *
 * Intended for unit tests, local development, and integration smoke tests
 * without live Minecraft ping.
 */
export class FixtureMinecraftStatusAdapter {
    fixtures;
    constructor(fixtures) {
        this.fixtures = fixtures;
    }
    async getStatus(host, port) {
        const key = `${host}:${String(port)}`;
        const raw = this.fixtures.get(key);
        if (raw === undefined)
            return null;
        return normalizeMinecraftServerStatus(raw);
    }
}
/**
 * Creates a FixtureMinecraftStatusAdapter from a plain object map.
 * Keys must be `"host:port"` strings.
 */
export const createFixtureAdapter = (entries) => new FixtureMinecraftStatusAdapter(new Map(Object.entries(entries)));
