import { describe, expect, it } from "bun:test";

import { LiveHytaleStatusAdapter, type HytaleServerStatus } from "../src";

const LIVE_ENABLED = process.env["LIVE_HYTALE_STATUS_TESTS"] === "1";
const LIVE_SUITE = LIVE_ENABLED ? describe : describe.skip;
const LIVE_STATUS_PROVIDERS = new Set<string>(["onequery", "minecraft-compatible-ping"]);
const LIVE_TEST_TIMEOUT_MS = 30_000;

interface LiveServerTarget {
  readonly host: string;
  readonly port: number;
}

interface LiveProbeResult extends LiveServerTarget {
  readonly ok: boolean;
  readonly provider: HytaleServerStatus["provider"] | null;
  readonly online: number | null;
  readonly max: number | null;
  readonly version: string | null;
  readonly motd: string | null;
  readonly latencyMs: number | null;
}

const parseLiveServers = (): readonly LiveServerTarget[] => {
  const raw = process.env["HYTALE_LIVE_SERVERS"] ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const separator = entry.lastIndexOf(":");
      if (separator <= 0 || separator === entry.length - 1) {
        throw new Error(`Invalid HYTALE_LIVE_SERVERS entry: ${entry}. Expected host:port.`);
      }

      const host = entry.slice(0, separator).trim().toLowerCase();
      const port = Number.parseInt(entry.slice(separator + 1), 10);
      if (host.length === 0 || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid HYTALE_LIVE_SERVERS entry: ${entry}. Expected host:port.`);
      }
      return { host, port };
    });
};

const isUsableStatus = (status: HytaleServerStatus | null): status is HytaleServerStatus =>
  status !== null &&
  typeof status.players.online === "number" &&
  LIVE_STATUS_PROVIDERS.has(status.provider);

const formatDiagnostics = (results: readonly LiveProbeResult[]): string =>
  results
    .map((result) =>
      [
        `${result.host}:${String(result.port)}`,
        `ok=${String(result.ok)}`,
        `provider=${result.provider ?? "none"}`,
        `online=${result.online === null ? "n/a" : String(result.online)}`,
        `max=${result.max === null ? "n/a" : String(result.max)}`,
        `version=${result.version ?? "n/a"}`,
        `motd=${result.motd ?? "n/a"}`,
        `latency=${result.latencyMs === null ? "n/a" : `${String(result.latencyMs)}ms`}`
      ].join(" ")
    )
    .join("\n");

LIVE_SUITE("live Hytale status smoke", () => {
  it("resolves at least one configured live Hytale server", async () => {
    const servers = parseLiveServers();
    if (servers.length === 0) {
      throw new Error(
        "LIVE_HYTALE_STATUS_TESTS=1 requires HYTALE_LIVE_SERVERS, for example host:5520,other:5520."
      );
    }

    const adapter = new LiveHytaleStatusAdapter({
      oneQueryTimeoutMs: 2500,
      pingTimeoutMs: 2500
    });
    const results: LiveProbeResult[] = [];

    for (const server of servers) {
      const status = await adapter.getStatus(server.host, server.port);
      results.push({
        ...server,
        ok: isUsableStatus(status),
        provider: status?.provider ?? null,
        online: status?.players.online ?? null,
        max: status?.players.max ?? null,
        version: status?.version ?? null,
        motd: status?.motd.clean ?? status?.motd.raw ?? null,
        latencyMs: status?.latencyMs ?? null
      });
    }

    console.info(`Live Hytale status diagnostics:\n${formatDiagnostics(results)}`);

    const successes = results.filter((result) => result.ok);
    if (successes.length === 0) {
      throw new Error(
        `No configured live Hytale servers returned usable status.\n${formatDiagnostics(results)}`
      );
    }

    expect(successes.length).toBeGreaterThan(0);
  }, LIVE_TEST_TIMEOUT_MS);
});
