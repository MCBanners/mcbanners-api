/**
 * SRV record resolution for Minecraft servers.
 *
 * Minecraft clients look up `_minecraft._tcp.<host>` SRV records before
 * connecting. If a record exists, the client connects to the resolved
 * host:port instead of the original host:25565.
 *
 * SRV resolution is only attempted when the caller uses the default port
 * (25565). If an explicit non-default port is provided, SRV is skipped —
 * the user has intentionally overridden the port.
 *
 * Reference: https://wiki.vg/SRV_records
 */

import * as dns from "node:dns/promises";

export interface SrvRecord {
  host: string;
  port: number;
}

/**
 * Resolver function type — injected into LiveMinecraftStatusAdapter to allow
 * deterministic testing without live DNS queries.
 */
export type SrvResolver = (host: string) => Promise<SrvRecord | null>;

/**
 * Looks up `_minecraft._tcp.<host>` SRV records using the system DNS resolver.
 *
 * Returns the first (highest-priority) record, or null when no record exists,
 * the domain has no SRV entry, or any DNS error occurs (ENOTFOUND, ENODATA,
 * ETIMEOUT, etc. are all treated as "no SRV record — fall back to A/AAAA").
 */
export async function resolveMcSrv(host: string): Promise<SrvRecord | null> {
  try {
    const records = await dns.resolveSrv(`_minecraft._tcp.${host}`);
    if (records.length === 0) return null;
    // The OS resolver pre-sorts records by priority/weight.
    const record = records[0]!;
    return { host: record.name, port: record.port };
  } catch {
    return null;
  }
}
